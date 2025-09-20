export enum UserRole {
  DOCTOR = 'Doctor',
}

export type Sender = 'USER' | 'AI';

export interface Citation {
  uri: string;
  title: string;
}

export interface DoctorProfile {
    qualification: 'MBBS' | 'BAMS' | 'BHMS';
    canPrescribeAllopathic: 'yes' | 'limited' | 'no';
}

// Types for Structured AI Responses
export interface DdxItem {
  diagnosis: string;
  rationale: string;
  confidence: 'High' | 'Medium' | 'Low';
}

// Doctor-specific types
export interface LabParameter {
  parameter: string;
  value: string;
  referenceRange: string;
  interpretation: string;
  urgency: 'Normal' | 'Abnormal' | 'Critical';
}

export interface LabResultAnalysis {
  overallInterpretation: string;
  results: LabParameter[];
}

export interface MedicalCode {
  code: string;
  description: string;
}

export interface MedicalCodeResult {
  query: string;
  codes: MedicalCode[];
}

export interface HandoutSection {
  heading: string;
  content: string;
}

export interface PatientHandout {
  title: string;
  introduction: string;
  sections: HandoutSection[];
  disclaimer: string;
}


export type StructuredDataType = 
  | { type: 'ddx'; data: DdxItem[]; summary: string }
  | { type: 'lab'; data: LabResultAnalysis; summary: string }
  | { type: 'billing'; data: MedicalCodeResult; summary: string }
  | { type: 'handout'; data: PatientHandout; summary: string };


export interface Message {
  id: string;
  sender: Sender;
  text: string;
  citations?: Citation[];
  structuredData?: StructuredDataType;
}

export interface Chat {
  id:string;
  title: string;
  messages: Message[];
  userRole: UserRole;
  gptId?: string;
}

export interface PreCodedGpt {
  id: string;
  title: string;
  description: string;
  icon: JSX.Element;
  roles: UserRole[];
}

// Types for Veda Session
export type VedaInsightCategory = 'Differential Diagnosis' | 'Questions to Ask' | 'Labs to Consider' | 'General Note';

export interface VedaInsightBlock {
    category: VedaInsightCategory;
    points: string[];
}

export interface TranscriptEntry {
    id: string;
    speaker: 'Doctor' | 'Patient';
    text: string;
    isProcessing?: boolean;
}

export interface PromptInsight {
    keyTerms: string[];
    suggestions: string[];
    followUps: string[];
}
