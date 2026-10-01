"use strict";

(function installFinancialRecoveryV1(){
  if (typeof Store === "undefined" || typeof dashboardStats !== "function") return;

  const ledger = Store.load();
  ledger.meta = ledger.meta || {};
  const broken = ledger.meta.realizedProfitLedgerV2;
  const authoritativeRsd = Number(dashboardStats("RSD").realizedProfit)||0;
  const completedSales = Store.all("sales").filter(sale =>
    typeof saleIsCompleted !== "function" || saleIsCompleted(sale)
  );
  const zeroShadow = broken
    && Number(broken.balanceRsd)===0
    && authoritativeRsd!==0
    && completedSales.length>0;

  if (zeroShadow && !ledger.meta.financialRecoveryV1){
    ledger.meta.financialRecoveryV1 = {
      version:1,
      recoveredAt:nowISO(),
      reason:"UNSAFE_REALIZED_PROFIT_V2_ZERO_SHADOW",
      authoritativeModel:"COMPLETED_SALE_PROFIT",
      authoritativeRealizedProfitRsd:authoritativeRsd,
      realizedProfitLedgerV2Backup:JSON.parse(JSON.stringify(broken))
    };
    Store.persist();
  }

  globalThis.__PN_FINANCIAL_RECOVERY_V1 = {
    version:1,
    model:"COMPLETED_SALE_PROFIT",
    zeroShadowRecovered:!!(zeroShadow&&ledger.meta.financialRecoveryV1)
  };
})();
