import React from 'react';
import { PreCodedGpt, UserRole } from './types';
import { Icon } from './components/Icon';

export const PRE_CODED_GPTS: PreCodedGpt[] = [
  // Doctor GPTs - Maternal Health Focus
  {
    id: 'doctor-emergency',
    title: 'Obstetric Emergencies',
    description: 'Instant, step-by-step FOGSI-recommended protocols for obstetric emergencies like PPH, Eclampsia, and Sepsis. No critical step missed.',
    icon: <Icon name="siren" />,
    roles: [UserRole.DOCTOR],
  },
  {
    id: 'doctor-guidelines',
    title: 'Clinical Guideline Search',
    description: 'Query the latest FOGSI, MoHFW, and WHO guidelines for standardized, high-quality care protocols on any maternal health topic.',
    icon: <Icon name="search" />,
    roles: [UserRole.DOCTOR],
  },
  {
    id: 'doctor-risk-assessment',
    title: 'Pregnancy Risk Assessment',
    description: 'Enter patient vitals and history to stratify risk for complications like pre-eclampsia and gestational diabetes.',
    icon: <Icon name="shield-heart" />,
    roles: [UserRole.DOCTOR],
    customComponentId: 'PregnancyRiskAssessment',
  },
  {
    id: 'doctor-ddx',
    title: 'Obstetric Differential Diagnosis',
    description: 'Input symptoms for a pregnant patient to receive a structured list of potential diagnoses relevant to maternal health.',
    icon: <Icon name="diagnosis" />,
    roles: [UserRole.DOCTOR],
  },
  {
    id: 'doctor-case-simulator',
    title: 'Maternal Health Case Simulator',
    description: 'Engage in realistic, AI-powered case simulations for training in obstetric emergencies and complex maternal health cases.',
    icon: <Icon name="clipboard-check" />,
    roles: [UserRole.DOCTOR],
  },
  {
    id: 'doctor-lab',
    title: 'Lab Result Analyzer',
    description: 'Interpret lab results for antenatal panels, identify abnormalities, and suggest next steps.',
    icon: <Icon name="lab" />,
    roles: [UserRole.DOCTOR],
    customComponentId: 'LabResultAnalysis',
  },
  {
    id: 'doctor-handout',
    title: 'Patient Handout Generator',
    description: 'Create easy-to-understand patient handouts for pregnancy-related conditions and advice.',
    icon: <Icon name="handout" />,
    roles: [UserRole.DOCTOR],
  },
];