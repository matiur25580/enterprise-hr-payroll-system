export function calcPayroll(salary:number){
  const basic = Math.round(salary*0.5)
  const hra = Math.round(salary*0.4)
  const pf = Math.round(basic*0.12)
  let tax = 0
  if(salary>100000) tax = Math.round(salary*0.2)
  else if(salary>50000) tax = Math.round(salary*0.1)
  else if(salary>25000) tax = Math.round(salary*0.05)
  const net = salary - pf - tax
  return { basic, hra, pf, tax, net }
}
