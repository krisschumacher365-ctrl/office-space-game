const fs = require("fs");

// ============================================================
//  INITECH CORP — OFFICE SPACE PENNY-FRACTION SIMULATOR
//  "We're not gonna do anything illegal... we're just gonna
//   take fractions of a penny from each transaction."
//                                    — Michael Bolton
//
//  100% fictional. All employees, transactions, and accounts
//  are made up. No real money. No real bank. Just vibes.
// ============================================================

const FAKE_EMPLOYEES = [
  { id: "E001", name: "Peter Gibbons",   salary: 49000.00 },
  { id: "E002", name: "Michael Bolton",  salary: 52000.00 },
  { id: "E003", name: "Samir Nagheenanajar", salary: 51000.00 },
  { id: "E004", name: "Milton Waddams",  salary: 38000.00 },
  { id: "E005", name: "Bill Lumbergh",   salary: 95000.00 },
  { id: "E006", name: "Tom Smykowski",   salary: 47000.00 },
  { id: "E007", name: "Joanna",          salary: 31000.00 },
  { id: "E008", name: "Drew",            salary: 44000.00 },
  { id: "E009", name: "Nina",            salary: 41000.00 },
  { id: "E010", name: "Dom Portwood",    salary: 72000.00 },
];

const TAX_RATE        = 0.0765;   // fictional payroll tax
const INSURANCE_RATE  = 0.0312;   // fictional deduction
const BIWEEKLY_PERIODS = 26;

// ---- helpers -----------------------------------------------

function randomJitter() {
  // tiny random overtime / deduction variance per pay period
  return (Math.random() - 0.5) * 20; // ±$10
}

function truncateToTwo(n) {
  return Math.floor(n * 100) / 100;   // banker drops the remainder
}

// ---- simulation --------------------------------------------

function simulateYear() {
  const ledger       = [];
  let totalSkimmed   = 0;
  const skimAccount  = { owner: "Peter's Off-Shore Coconut Fund 🥥", balance: 0 };

  console.log("=".repeat(60));
  console.log("  INITECH CORP — PAYROLL PENNY-FRACTION SIMULATOR");
  console.log("  Fiscal Year 2026 (totally fictional)");
  console.log("=".repeat(60));
  console.log();

  for (let period = 1; period <= BIWEEKLY_PERIODS; period++) {
    let periodSkim = 0;

    for (const emp of FAKE_EMPLOYEES) {
      const grossPay    = emp.salary / BIWEEKLY_PERIODS + randomJitter();
      const tax         = grossPay * TAX_RATE;
      const insurance   = grossPay * INSURANCE_RATE;
      const netExact    = grossPay - tax - insurance;
      const netRounded  = truncateToTwo(netExact);
      const fraction    = +(netExact - netRounded).toFixed(6);

      periodSkim   += fraction;
      totalSkimmed += fraction;

      ledger.push({
        period,
        employeeId:   emp.id,
        employee:     emp.name,
        grossPay:     +grossPay.toFixed(6),
        tax:          +tax.toFixed(6),
        insurance:    +insurance.toFixed(6),
        netExact:     +netExact.toFixed(6),
        netPaid:      netRounded,
        fractionSkimmed: +fraction.toFixed(6),
      });
    }

    skimAccount.balance += periodSkim;
  }

  // ---- console summary ------------------------------------
  skimAccount.balance = +skimAccount.balance.toFixed(2);

  console.log(`  Employees processed : ${FAKE_EMPLOYEES.length}`);
  console.log(`  Pay periods (bi-wk) : ${BIWEEKLY_PERIODS}`);
  console.log(`  Total transactions  : ${ledger.length}`);
  console.log();
  console.log("  --- 💰 THE SKIM ---");
  console.log(`  Total fractions collected : $${skimAccount.balance.toFixed(2)}`);
  console.log(`  Destination              : ${skimAccount.owner}`);
  console.log();

  if (skimAccount.balance > 100) {
    console.log('  ⚠️  "I think we messed up the decimal point."');
    console.log('      "We sure did. This is WAY more than a penny."');
  } else {
    console.log('  "Fractions of a penny, Michael. Nobody will notice."');
  }

  console.log();
  console.log("=".repeat(60));

  // ---- write JSON report ----------------------------------
  const report = {
    company:   "Initech Corp (FICTIONAL)",
    fiscalYear: 2026,
    disclaimer: "This is a movie-inspired simulation. No real money involved.",
    summary: {
      employees:        FAKE_EMPLOYEES.length,
      payPeriods:       BIWEEKLY_PERIODS,
      totalTransactions: ledger.length,
      totalSkimmed:     skimAccount.balance,
      skimDestination:  skimAccount.owner,
    },
    transactions: ledger,
  };

  const outPath = "initech_report.json";
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`  Report saved to ${outPath}`);
  console.log("=".repeat(60));
}

// ---- run ---------------------------------------------------
simulateYear();
