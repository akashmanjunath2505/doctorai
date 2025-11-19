import React, { useState } from 'react';
import { Icon } from './Icon';

interface FormData {
    age: string;
    bmi: string;
    systolicBP: string;
    diastolicBP: string;
    glucose: string;
    history: string[];
}

interface PregnancyRiskAssessmentFormProps {
  onSubmit: (formData: FormData) => void;
}

const medicalHistoryOptions = [
    'Previous C-section',
    'Pre-existing Hypertension',
    'Pre-existing Diabetes',
    'History of Pre-eclampsia',
    'Multiple Gestation',
    'Anemia (Hb < 11 g/dL)',
    'Advanced Maternal Age (>35)',
];

export const PregnancyRiskAssessmentForm: React.FC<PregnancyRiskAssessmentFormProps> = ({ onSubmit }) => {
    const [formData, setFormData] = useState<FormData>({
        age: '',
        bmi: '',
        systolicBP: '',
        diastolicBP: '',
        glucose: '',
        history: [],
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = e.target;
        if (checked) {
            setFormData(prev => ({ ...prev, history: [...prev.history, value] }));
        } else {
            setFormData(prev => ({ ...prev, history: prev.history.filter(item => item !== value) }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-4 animate-fadeInUp">
            <div className="w-full max-w-2xl bg-aivana-light-grey rounded-xl p-6 md:p-8 border border-aivana-light-grey/50">
                <div className="flex items-center gap-3 mb-4">
                    <Icon name="shield-heart" className="w-8 h-8 text-aivana-accent" />
                    <h2 className="text-2xl font-bold text-white">Pregnancy Risk Assessment</h2>
                </div>
                <p className="text-gray-400 mb-6 text-sm">Enter patient data to generate a risk stratification and receive evidence-based recommendations.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Input fields */}
                        <div>
                            <label htmlFor="age" className="block text-xs font-medium text-gray-300 mb-1">Patient Age</label>
                            <input type="number" name="age" id="age" value={formData.age} onChange={handleChange} className="w-full bg-aivana-dark p-2 rounded-md border border-aivana-light-grey/80 focus:ring-aivana-accent focus:border-aivana-accent" required />
                        </div>
                        <div>
                            <label htmlFor="bmi" className="block text-xs font-medium text-gray-300 mb-1">Body Mass Index (BMI)</label>
                            <input type="number" step="0.1" name="bmi" id="bmi" value={formData.bmi} onChange={handleChange} className="w-full bg-aivana-dark p-2 rounded-md border border-aivana-light-grey/80 focus:ring-aivana-accent focus:border-aivana-accent" required />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-300 mb-1">Blood Pressure (mmHg)</label>
                            <div className="flex gap-2">
                                <input type="number" name="systolicBP" placeholder="Systolic" value={formData.systolicBP} onChange={handleChange} className="w-full bg-aivana-dark p-2 rounded-md border border-aivana-light-grey/80 focus:ring-aivana-accent focus:border-aivana-accent" required />
                                <input type="number" name="diastolicBP" placeholder="Diastolic" value={formData.diastolicBP} onChange={handleChange} className="w-full bg-aivana-dark p-2 rounded-md border border-aivana-light-grey/80 focus:ring-aivana-accent focus:border-aivana-accent" required />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="glucose" className="block text-xs font-medium text-gray-300 mb-1">Fasting Blood Glucose (mg/dL)</label>
                            <input type="number" name="glucose" id="glucose" value={formData.glucose} onChange={handleChange} className="w-full bg-aivana-dark p-2 rounded-md border border-aivana-light-grey/80 focus:ring-aivana-accent focus:border-aivana-accent" required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-300 mb-2">Relevant Medical History</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {medicalHistoryOptions.map(option => (
                                <label key={option} className="flex items-center space-x-2 p-2 rounded-md hover:bg-aivana-grey cursor-pointer">
                                    <input type="checkbox" value={option} checked={formData.history.includes(option)} onChange={handleCheckboxChange} className="form-checkbox h-4 w-4 text-aivana-accent bg-aivana-dark border-aivana-light-grey/80 focus:ring-aivana-accent" />
                                    <span className="text-sm text-gray-300">{option}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <button type="submit" className="w-full !mt-6 bg-aivana-accent hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                        <Icon name="diagnosis" className="w-5 h-5"/>
                        Submit for Assessment
                    </button>
                </form>
            </div>
        </div>
    );
};