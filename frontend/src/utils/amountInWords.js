const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

function twoDigits(n) {
  if (n < 20) return ones[n];
  return (tens[Math.floor(n/10)] + (n%10 ? ' '+ones[n%10] : '')).trim();
}

function threeDigits(n) {
  if (n >= 100) return ones[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' '+twoDigits(n%100) : '');
  return twoDigits(n);
}

export function amountInWords(amount) {
  const n = Math.round(parseFloat(amount) || 0);
  if (n === 0) return 'Rupees Zero Only';
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  let result = '';
  if (crore) result += threeDigits(crore) + ' Crore ';
  if (lakh) result += threeDigits(lakh) + ' Lakh ';
  if (thousand) result += threeDigits(thousand) + ' Thousand ';
  if (rest) result += threeDigits(rest);
  return 'Rupees ' + result.trim() + ' Only';
}
