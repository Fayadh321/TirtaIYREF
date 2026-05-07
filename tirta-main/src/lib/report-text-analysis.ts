import type { RiskCategory } from "@/generated/prisma";

export type AiMetricsRatios = {
  vegetation_ratio: number;
  soil_ratio: number;
  impervious_ratio: number;
  building_ratio: number;
};

function toCategoryLabel(category: RiskCategory | string) {
  if (category === "TINGGI") return "tinggi";
  if (category === "SEDANG") return "sedang";
  if (category === "RENDAH") return "rendah";
  return String(category ?? "unknown").toLowerCase();
}

function summaryByCategory(category: RiskCategory | string) {
  if (category === "TINGGI") {
    return "Area ini tergolong memiliki risiko banjir tinggi berdasarkan analisis lingkungan visual.";
  }
  if (category === "SEDANG") {
    return "Area ini memiliki risiko banjir menengah dan tetap memerlukan perhatian terhadap kondisi lingkungan sekitar.";
  }
  return "Area ini tergolong memiliki risiko banjir rendah dengan kondisi lingkungan yang relatif lebih baik.";
}

export function buildTextAnalysis(params: {
  finalFRI: number;
  category: RiskCategory | string;
  metrics: AiMetricsRatios | null;
}): string {
  const { finalFRI, category, metrics } = params;

  if (!metrics) {
    return `Area ini memiliki Final Flood Risk Index (FRI) sebesar ${finalFRI.toFixed(1)} dengan kategori ${toCategoryLabel(category)}.`;
  }

  const { vegetation_ratio, soil_ratio, impervious_ratio, building_ratio } =
    metrics;

  const notes: string[] = [];

  if (impervious_ratio > 0.5) {
    notes.push(
      "Area memiliki dominasi permukaan kedap air yang tinggi sehingga potensi limpasan air meningkat.",
    );
  }

  if (building_ratio > 0.6) {
    notes.push(
      "Kepadatan bangunan yang tinggi dapat mengurangi kapasitas resapan dan memperbesar risiko genangan.",
    );
  }

  if (vegetation_ratio < 0.15) {
    notes.push(
      "Vegetasi di area ini tergolong rendah sehingga kemampuan penyerapan air alami terbatas.",
    );
  }

  if (soil_ratio < 0.1) {
    notes.push(
      "Area resapan terbuka sangat minim sehingga infiltrasi air berpotensi kurang optimal.",
    );
  }

  const summary = summaryByCategory(category);

  return (
    `${summary} ` +
    `Final Flood Risk Index (FRI) tercatat sebesar ${finalFRI.toFixed(1)}. ` +
    notes.join(" ")
  );
}
