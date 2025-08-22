'use client';

import LightingBackground from '@/components/LightingBackground';
import ControlPanel from '@/components/ControlPanel';
import CuteCompanion from '@/components/CuteCompanion';
import { useWebSocketConnection } from '@/hooks/useWebSocket';

export default function Home() {
    const { state, isConnected, message, isActivatorActive, triggerEffect, clearMessage } = useWebSocketConnection();

    // Transform lights for the background component
    const backgroundLights = state.lights.map((light, index) => ({
        id: light.id,
        x: index === 0 ? 50 : index === 1 ? 0 : 100, // Center, left, right positions
        y: index === 0 ? 0 : 100, // Center light higher, side lights lower
        color: light.isOn ? light.color : '#cccccc',
        brightness: light.isOn ? light.brightness : 0,
    }));

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Dynamic lighting background */}
            <LightingBackground lights={backgroundLights}/>

            {/* Connection status indicator */}
            <div className="absolute top-4 right-4 z-20">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                    isConnected
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-red-100 text-red-800 border border-red-200'
                }`}>
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}/>
                    {isConnected ? 'Conectado' : 'Sin conexión'}
                </div>
            </div>

            {/* Main content container */}
            <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
                <div className="relative">
                    {/* Cute companion positioned above the control panel */}
                    <div className="absolute -top-[3rem] left-1/2 transform -translate-x-1/2 z-20">
                        <CuteCompanion
                            message={message}
                            onMessageComplete={clearMessage}
                            isPresent={state.isPresent}
                            isConnected={isConnected}
                        />
                    </div>

                    {/* Main control panel */}
                    <ControlPanel
                        isPresent={state.isPresent}
                        isConnected={isConnected}
                        isActivatorActive={isActivatorActive}
                        onTriggerEffect={triggerEffect}
                    />
                </div>
            </div>
        </div>
    );
}
