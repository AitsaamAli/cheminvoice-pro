/**
 * Offline queue retry job — INV-8.
 * Polls FBRSubmission records with status='ERROR' every 5 minutes
 * and re-attempts FBR submission for invoices that haven't exceeded max retries.
 *
 * Idempotency: FBRSubmission has @@unique([invoiceId]) so a double-submit
 * will hit a unique constraint, not create a second IRN.
 */

const prisma = require('../lib/prisma');
const FBR = require('../config/fbr');

let running = false;

async function retryFailedSubmissions() {
  if (running) return; // prevent overlap if a run is slow
  running = true;

  try {
    const failed = await prisma.fBRSubmission.findMany({
      where: {
        status: 'ERROR',
        retryCount: { lt: FBR.queueMaxRetries },
      },
      orderBy: { lastRetryAt: 'asc' },
      take: 10, // process up to 10 per cycle
    });

    if (failed.length === 0) {
      running = false;
      return;
    }

    console.log(`[FBR Retry Job] ${failed.length} failed submission(s) to retry`);

    // Load fbrService lazily to avoid circular import issues
    const fbrService = require('../services/fbrService');

    for (const submission of failed) {
      try {
        const invoice = await prisma.invoice.findUnique({
          where: { id: submission.invoiceId },
          include: { items: true, company: true, customer: true },
        });

        if (!invoice) {
          // Invoice was deleted — mark submission as permanently abandoned
          await prisma.fBRSubmission.update({
            where: { id: submission.id },
            data: { status: 'ABANDONED', errorMessage: 'Invoice no longer exists' },
          });
          continue;
        }

        // Already accepted in a prior retry — mark record consistent
        if (invoice.fbrStatus === 'ACCEPTED') {
          await prisma.fBRSubmission.update({
            where: { id: submission.id },
            data: { status: 'ACCEPTED', acceptedAt: invoice.submittedAt },
          });
          continue;
        }

        // INV-7: Don't retry if outside the 72-hour cancellation window
        const ageHours = (Date.now() - new Date(invoice.createdAt).getTime()) / 3600000;
        if (ageHours > FBR.cancelWindowHours) {
          await prisma.fBRSubmission.update({
            where: { id: submission.id },
            data: {
              status: 'ABANDONED',
              errorMessage: `Invoice older than ${FBR.cancelWindowHours} hours — FBR window expired`,
            },
          });
          console.warn(`[FBR Retry Job] Invoice ${invoice.invoiceNumber} abandoned — outside 72h window`);
          continue;
        }

        console.log(`[FBR Retry Job] Retrying invoice ${invoice.invoiceNumber} (attempt ${submission.retryCount + 1})`);

        await fbrService.submitInvoiceToFBR(invoice, invoice.items, invoice.company, invoice.customer);

        console.log(`[FBR Retry Job] Invoice ${invoice.invoiceNumber} — retry succeeded`);
      } catch (err) {
        console.error(`[FBR Retry Job] Retry failed for invoice ${submission.invoiceId}:`, err.message);
        // fbrService.submitInvoiceToFBR already updates FBRSubmission on failure
      }
    }
  } catch (err) {
    console.error('[FBR Retry Job] Job error:', err.message);
  } finally {
    running = false;
  }
}

function startRetryJob() {
  // Don't run in test environments
  if (process.env.NODE_ENV === 'test') return;

  console.log(`[FBR Retry Job] Started — polling every ${FBR.queuePollIntervalMs / 60000} minutes`);
  retryFailedSubmissions(); // run once immediately on startup
  return setInterval(retryFailedSubmissions, FBR.queuePollIntervalMs);
}

module.exports = { startRetryJob, retryFailedSubmissions };
