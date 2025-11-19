import React from 'react';
import { Icon } from './Icon';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  const appVersion = "2.0.0-NEXUS";

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center transition-opacity"
      aria-modal="true"
      role="dialog"
    >
      <div className="bg-aivana-grey rounded-2xl shadow-xl w-full max-w-lg m-4 transform transition-all text-white border border-aivana-light-grey">
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Icon name="info" className="w-6 h-6 text-aivana-accent" />
                    <h2 className="text-xl font-bold">About Aivana Clinical Support</h2>
                </div>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-aivana-light-grey">
                    <Icon name="close" className="w-5 h-5"/>
                </button>
            </div>
          
            <div className="text-sm text-gray-300 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                <p>
                    <strong>Aivana</strong> is a clinical decision support tool designed to assist healthcare professionals in maternal and obstetric care. Its primary goal is to provide quick, evidence-based information at the point of care, especially in high-pressure or resource-limited settings.
                </p>

                <div className="p-3 bg-purple-900/30 border border-purple-500/50 rounded-lg">
                    <h3 className="font-semibold text-white mb-2">Powered by the NEXUS Reasoning Framework</h3>
                    <p className="text-xs">
                        This application's core intelligence is powered by <strong>NEXUS (Neural Evidence eXtraction & Uncertainty Synthesis)</strong>, a next-generation clinical reasoning framework. NEXUS moves beyond simple AI answers by operationalizing the cognitive processes of expert clinicians, integrating probabilistic Bayesian medicine, and implementing rigorous safeguards against diagnostic bias. Every conclusion is the result of a multi-stage, auditable reasoning process designed for maximum clinical safety and accuracy.
                    </p>
                </div>
                
                <div className="p-3 bg-aivana-fogsi-blue/20 border border-aivana-fogsi-blue/50 rounded-lg">
                    <h3 className="font-semibold text-white mb-2">FOGSI Guideline Alignment</h3>
                    <p className="text-xs">
                        The core clinical knowledge base of this application is aligned with the latest Good Clinical Practice Recommendations (GCPRs) and guidelines published by the <strong className="text-white">Federation of Obstetric and Gynaecological Societies of India (FOGSI)</strong>. We acknowledge the critical work of the FOGSI Safe Motherhood Committee and other expert groups in establishing these standards of care.
                    </p>
                </div>
                
                <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
                    <h3 className="font-semibold text-white mb-2">CRITICAL CLINICAL DISCLAIMER</h3>
                    <p className="text-xs">
                        This tool is intended for informational and educational purposes only. It is <strong className="text-white">NOT</strong> a substitute for professional medical advice, diagnosis, treatment, or the independent clinical judgment of a qualified healthcare provider. All information, protocols, and dosing recommendations must be verified against the most current official guidelines and adapted to the specific clinical context of the patient. The responsibility for patient care rests solely with the treating clinician.
                    </p>
                </div>

                <p className="text-xs text-center text-gray-500 pt-2">
                    Application Version: {appVersion}
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};