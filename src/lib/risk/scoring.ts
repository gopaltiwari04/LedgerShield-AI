/**
 * Explainable Risk Scoring Engine
 * 
 * Transparently separates:
 * 1. Financial Impact Score (0-100): Direct quantitative exposure
 * 2. Anomaly Confidence Score (0-100): Mathematical certainty and extraction confidence
 * 3. Fraud Suspicion Score (0-100): Behavioral patterns, repetition, and control bypasses
 * 4. Composite Risk Score (0-100): Explainable weighted synthesis
 */

export interface RiskEvaluationInput {
  grossDiscrepancy: number;
  isPaid: boolean;
  extractionConfidence?: number;
  independentSignalCount: number;
  hasRepeatedPattern?: boolean;
  isApprovalThresholdAvoidance?: boolean;
  hasControlOverride?: boolean;
  hasSharedSupplierEntity?: boolean;
}

export interface RiskEvaluationOutput {
  financialImpactScore: number;
  anomalyConfidence: number;
  fraudSuspicionScore: number;
  compositeRiskScore: number;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  explanationFactors: string[];
}

export function evaluateRisk(input: RiskEvaluationInput): RiskEvaluationOutput {
  const explanationFactors: string[] = [];

  // 1. Financial Impact (Log-linear scale benchmarked against SME Indian purchasing)
  // < ₹5k: Low, ₹5k - ₹50k: Medium, ₹50k - ₹5L: High, > ₹5L: Critical
  let financialImpactScore = 10;
  if (input.grossDiscrepancy > 500000) {
    financialImpactScore = 95;
    explanationFactors.push("High financial exposure exceeding ₹5,00,000");
  } else if (input.grossDiscrepancy >= 50000) {
    financialImpactScore = 70 + Math.min(20, (input.grossDiscrepancy - 50000) / 22500);
    explanationFactors.push("Significant exposure between ₹50,000 and ₹5,00,000");
  } else if (input.grossDiscrepancy >= 5000) {
    financialImpactScore = 40 + (input.grossDiscrepancy - 5000) / 1500;
    explanationFactors.push("Moderate exposure between ₹5,000 and ₹50,000");
  } else if (input.grossDiscrepancy > 0) {
    financialImpactScore = 20 + (input.grossDiscrepancy / 5000) * 15;
    explanationFactors.push("Minor exposure under ₹5,000");
  } else {
    financialImpactScore = 10;
  }
  financialImpactScore = Math.min(100, Math.round(financialImpactScore));

  // 2. Anomaly Confidence (Deterministic matching has high confidence 85-98%)
  let anomalyConfidence = (input.extractionConfidence ?? 0.95) * 100;
  if (input.grossDiscrepancy > 0) {
    anomalyConfidence = Math.min(99, Math.max(70, anomalyConfidence));
  }
  anomalyConfidence = Math.round(anomalyConfidence);
  explanationFactors.push(`Discrepancy verified through deterministic reconciliation (${anomalyConfidence}% extraction certainty)`);

  // 3. Fraud Suspicion Score
  // Suspicion is low for isolated arithmetic or clerical errors, but increases with corroborating signals
  let fraudSuspicionScore = 15; // Baseline low suspicion: innocent error assumed first

  if (input.isApprovalThresholdAvoidance) {
    fraudSuspicionScore += 35;
    explanationFactors.push("Transaction values cluster suspiciously just below mandatory approval thresholds");
  }
  if (input.hasSharedSupplierEntity) {
    fraudSuspicionScore += 30;
    explanationFactors.push("Multiple vendor entities share identical bank account / tax identifier details");
  }
  if (input.hasControlOverride) {
    fraudSuspicionScore += 25;
    explanationFactors.push("Single-user bypass of segregation-of-duties or manual tolerance override observed");
  }
  if (input.hasRepeatedPattern) {
    fraudSuspicionScore += 20;
    explanationFactors.push("Repeated occurrences of same discrepancy observed across multiple billing cycles");
  }
  if (input.independentSignalCount >= 2) {
    fraudSuspicionScore += 15;
    explanationFactors.push(`Corroborated by ${input.independentSignalCount} independent transaction anomalies`);
  }

  fraudSuspicionScore = Math.min(100, Math.max(5, Math.round(fraudSuspicionScore)));

  // 4. Composite Risk Score:
  // Weighted: 40% Financial Impact + 30% Confidence + 30% Suspicion
  const compositeRiskScore = Math.round(
    financialImpactScore * 0.40 +
    anomalyConfidence * 0.30 +
    fraudSuspicionScore * 0.30
  );

  // Determine Severity
  let severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
  if (compositeRiskScore >= 80 || (input.grossDiscrepancy >= 50000 && input.isPaid)) {
    severity = "CRITICAL";
  } else if (compositeRiskScore >= 60 || input.grossDiscrepancy >= 25000) {
    severity = "HIGH";
  } else if (compositeRiskScore >= 35 || input.grossDiscrepancy >= 5000) {
    severity = "MEDIUM";
  }

  return {
    financialImpactScore,
    anomalyConfidence,
    fraudSuspicionScore,
    compositeRiskScore,
    severity,
    explanationFactors,
  };
}
