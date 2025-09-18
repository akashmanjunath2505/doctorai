import React from 'react';
import { PreCodedGpt, UserRole } from './types';
import { Icon } from './components/Icon';

export const PRE_CODED_GPTS: PreCodedGpt[] = [
  // Doctor GPTs
  {
    id: 'doctor-ddx',
    title: 'Differential Diagnosis',
    description: 'Input symptoms to receive a structured list of potential diagnoses.',
    icon: <Icon name="diagnosis" />,
    roles: [UserRole.DOCTOR],
  },
  {
    id: 'doctor-handout',
    title: 'Patient Handout Generator',
    description: 'Create easy-to-understand patient handouts for various conditions.',
    icon: <Icon name="handout" />,
    roles: [UserRole.DOCTOR],
  },
  {
    id: 'doctor-lab',
    title: 'Lab Result Analyzer',
    description: 'Interpret lab results, identify abnormalities, and suggest next steps.',
    icon: <Icon name="lab" />,
    roles: [UserRole.DOCTOR],
  },
];
