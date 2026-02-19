// lib/schema.ts
export type Difficulty = "easy" | "medium" | "hard";

export type PatientProfile = {
  age: number;
  sex: "male" | "female";
  bmi: number;
  a1c: number;
  egfr: number;
  cost: "low" | "medium" | "high";
  comorbidities: {
    ascvd: boolean;
    hf: boolean;
    ckdAlbuminuria: boolean;
  };
  onMetformin: boolean;
};

export type CaseStep =
  | { id: "step1"; type: "next-med"; prompt: string }
  | { id: "step2"; type: "titrate-or-add"; prompt: string }
  | { id: "step3"; type: "contraindications"; prompt: string }
  | { id: "step4"; type: "debrief"; prompt: string };

export type ClinicalCase = {
  caseId: string;
  difficulty: Difficulty;
  title: string;
  bullets: string[];          // concise presentation
  patient: PatientProfile;
  currentMeds: string[];
  labs: { label: string; value: string }[];
  steps: CaseStep[];
};
