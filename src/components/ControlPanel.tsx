'use client';

import { useState } from 'react';

interface LightEffect {
    id: string;
    name: string;
    description?: string;
    icon: string;
    parameters?: {
        name: string;
        type: 'slider' | 'color' | 'individual-colors' | 'select';
        unit?: string;
        options?: string[];
        min?: number;
        max?: number;
        default: any;
    }[];
}

interface ControlPanelProps {
    isPresent: boolean;
    isConnected: boolean;
    isActivatorActive: boolean;
    onTriggerEffect: (effectId: string, parameters: Record<string, any>) => void;
}

const LIGHT_EFFECTS: LightEffect[] = [
    {
        id: 'interruptor',
        name: 'Interruptor',
        icon: '💡',
    },
    {
        id: 'color',
        name: 'Color',
        description: 'Cambia el color e intensidad de las luces',
        icon: '🎨',
        parameters: [
            { name: 'individual-colors', type: 'individual-colors', default: false },
            { name: 'color', type: 'color', default: '#9900ff' },
            { name: 'intensidad', type: 'slider', min: 1, max: 255, default: 128 },
        ]
    },
    {
        id: 'parpadear',
        name: 'Parpadear',
        description: 'Haz parpadear las luces rápidamente',
        icon: '⚡',
        parameters: [
            { name: 'duracion', type: 'slider', unit: 'segundos', min: 3, max: 30, default: 15 },
        ]
    },
    {
        id: 'efecto-luz',
        name: 'Efecto',
        icon: '🌈',
        parameters: [
            {
                name: 'efecto',
                type: 'select',
                options: ['Arcoiris', 'Fuego', 'Policia'],
                default: 'Arcoiris'
            },
            { name: 'duracion', type: 'slider', unit: 'segundos', min: 3, max: 60, default: 15 },
        ]
    }
];

const EFFECT_NAME_TO_ID: Record<string, string> = {
    'Arcoiris': 'rainbow',
    'Fuego': 'fire',
    'Policia': 'police'
}

export default function ControlPanel({
                                         isPresent,
                                         isConnected,
                                         isActivatorActive,
                                         onTriggerEffect
                                     }: ControlPanelProps) {
    const [selectedEffect, setSelectedEffect] = useState(LIGHT_EFFECTS[0]);
    const [parameters, setParameters] = useState<Record<string, any>>({});
    const [isTriggering, setIsTriggering] = useState(false);
    const [isIndividualMode, setIsIndividualMode] = useState(false);
    const [individualColors, setIndividualColors] = useState({ left: '#9900ff', center: '#9900ff', right: '#9900ff' });

    const handleTriggerEffect = async () => {
        // Check if script is active for script-based effects
        if (!isPresent || !isConnected || isTriggering || isActivatorActive) return;

        const defaults = LIGHT_EFFECTS
            .find(effect => effect.id === selectedEffect.id)?.parameters
            ?.reduce((acc, curr) => ({ ...acc, [curr.name]: curr.default }), {});
        if (selectedEffect.id === 'efecto-luz') {
            // @ts-expect-error We know defaults is defined here
            defaults.efecto = EFFECT_NAME_TO_ID[defaults.efecto] || defaults.efecto;
        }

        // For color effect, include individual mode state and colors
        let effectParameters = { ...defaults, ...parameters };
        if (selectedEffect.id === 'color') {
            effectParameters = {
                ...effectParameters,
                isIndividualMode,
                individualColors: isIndividualMode ? individualColors : undefined
            };
        }

        onTriggerEffect(selectedEffect.id, effectParameters);
        setIsTriggering(true);
        setTimeout(() => setIsTriggering(false), 1000);
    };

    const updateParameter = (name: string, value: any) => {
        if (selectedEffect.id === 'efecto-luz' && name === 'efecto')
            value = EFFECT_NAME_TO_ID[value] || value;

        setParameters(prev => ({ ...prev, [name]: value }));
    };

    const updateIndividualColor = (lightId: string, color: string) => {
        setIndividualColors(prev => ({ ...prev, [lightId]: color }));
    };

    return (
        <div className="relative z-10 bg-white/75 backdrop-blur-md rounded-3xl shadow-2xl p-8 max-w-md mx-auto">
            {/* Presence indicator */}
            <div className="flex items-center justify-center mb-6">
                <div
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                        isPresent
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : 'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                    <div className={`w-2 h-2 rounded-full ${isPresent ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}/>
                    {isPresent ? 'Presente' : 'Ausente'}
                </div>
            </div>

            {/* Effect tabs */}
            <div className="grid grid-cols-2 gap-2 mb-6">
                {LIGHT_EFFECTS.map((effect) => (
                    <button
                        key={effect.id}
                        onClick={() => setSelectedEffect(effect)}
                        className={`p-3 rounded-xl transition-all duration-200 cursor-pointer ${
                            selectedEffect.id === effect.id
                                ? 'bg-purple-100 border-2 border-purple-300 shadow-md'
                                : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                        }`}
                    >
                        <div className="text-2xl mb-1">{effect.icon}</div>
                        <div className="text-xs font-semibold text-gray-700">{effect.name}</div>
                    </button>
                ))}
            </div>

            {/* Effect parameters */}
            {selectedEffect.parameters && (
                <div className="mb-6 space-y-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Parámetros</h3>
                    {selectedEffect.parameters.map((param) => {
                        return (
                            <div key={param.name} className="space-y-2">
                                {param.type === 'individual-colors'
                                    ? <>
                                        <div className="space-y-3">
                                            {/* Toggle for individual vs group control */}
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-medium text-gray-600">
                                                    Control Individual
                                                </label>
                                                <button
                                                    onClick={() => setIsIndividualMode(!isIndividualMode)}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                                                        isIndividualMode ? 'bg-purple-600' : 'bg-gray-200'
                                                    }`}
                                                >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                    isIndividualMode ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                            />
                                                </button>
                                            </div>

                                            {/* Individual color controls */}
                                            {isIndividualMode && (
                                                <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                                                    {(['left', 'center', 'right'] as const).map((lightId) => (
                                                        <div key={lightId} className="flex items-center gap-3">
                                                            <label
                                                                className="text-xs font-medium text-gray-600 w-16 capitalize">
                                                                {lightId === 'left' ? 'Izquierda' : lightId === 'center' ? 'Centro' : 'Derecha'}
                                                            </label>
                                                            <input
                                                                type="color"
                                                                value={individualColors[lightId]}
                                                                onChange={(e) => updateIndividualColor(lightId, e.target.value)}
                                                                className="w-[80%] h-8 rounded-md border border-gray-200 cursor-pointer"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                    : (
                                        <>
                                            {!(param.type === 'color' && isIndividualMode) && (
                                                <label className="text-xs font-medium text-gray-600 capitalize">
                                                    {param.name}
                                                </label>)}
                                            {param.type === 'slider' ?
                                                <p className="text-gray-600">
                                                    {parameters[param.name] || param.default} {param.unit ? `${param.unit}` : ''}
                                                </p>
                                                : null}
                                            {param.type === 'slider' && (
                                                <input
                                                    type="range"
                                                    min={param.min}
                                                    max={param.max}
                                                    defaultValue={param.default}
                                                    onChange={(e) => updateParameter(param.name, parseInt(e.target.value))}
                                                    className="w-full h-2 bg-gray-400 rounded-lg appearance-none cursor-pointer slider"
                                                />
                                            )}
                                            {param.type === 'color' && !isIndividualMode && (
                                                <input
                                                    type="color"
                                                    defaultValue={param.default}
                                                    onChange={(e) => updateParameter(param.name, e.target.value)}
                                                    className="w-full h-10 rounded-lg border border-gray-200 cursor-pointer"
                                                />
                                            )}
                                            {param.type === 'select' && (
                                                <select
                                                    defaultValue={param.default}
                                                    onChange={(e) => updateParameter(param.name, e.target.value)}
                                                    className="w-full h-10 rounded-lg border border-gray-200 text-gray-700 px-3 bg-white cursor-pointer"
                                                >
                                                    {param.options?.map((option) => (
                                                        <option key={option} value={option}>
                                                            {option}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        </>
                                    )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Main trigger button */}
            <button
                onClick={handleTriggerEffect}
                disabled={!isPresent || !isConnected || isTriggering || isActivatorActive}
                className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 transform cursor-pointer ${
                    !isPresent || !isConnected || isActivatorActive
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : isTriggering
                            ? 'bg-purple-400 text-white scale-95'
                            : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 hover:scale-105 shadow-lg hover:shadow-xl'
                }`}
            >
                {isTriggering || isActivatorActive ? (
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                            En Progreso...
                        </div>
                    )
                    : !isConnected ? <div className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                            Reconectando...
                        </div>
                        : (
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-2xl">{selectedEffect.icon}</span>
                                Activar {selectedEffect.name}
                            </div>
                        )}
            </button>

            {selectedEffect.description && <p className="text-xs text-gray-500 text-center mt-3">
                {selectedEffect.description}
            </p>}
        </div>
    );
}
