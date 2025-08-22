'use client';

import { useEffect, useState } from 'react';

interface Light {
    id: string;
    x: number; // percentage from left
    y: number; // percentage from top
    color: string;
    brightness: number;
}

interface LightingBackgroundProps {
    lights: Light[];
}

export default function LightingBackground({ lights }: LightingBackgroundProps) {
    const [mounted, setMounted] = useState(false);
    const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        setMounted(true);

        const updateViewportSize = () => {
            setViewportSize({
                width: window.innerWidth,
                height: window.innerHeight
            });
        };

        updateViewportSize();
        window.addEventListener('resize', updateViewportSize);

        return () => window.removeEventListener('resize', updateViewportSize);
    }, []);

    if (!mounted) return null;

    // Calculate base size from viewport diagonal for consistent scaling
    const baseSize = Math.sqrt(viewportSize.width ** 2 + viewportSize.height ** 2);

    // Target aspect ratio (16:9 1080p screen minus browser's default top bar size) for reference positioning
    const targetAspectRatio = 1920 / 944;
    const currentAspectRatio = viewportSize.width / viewportSize.height;

    // Calculate scaling and offset to maintain consistent relative positioning
    let scaleX = 1;
    let scaleY = 1;
    let offsetX = 0;
    let offsetY = 0;

    if (currentAspectRatio > targetAspectRatio) {
        // Screen is wider than target - scale down horizontally and center
        scaleX = targetAspectRatio / currentAspectRatio;
        offsetX = (100 - (scaleX * 100)) / 2;
    } else {
        // Screen is taller than target - scale down vertically and center
        scaleY = currentAspectRatio / targetAspectRatio;
        offsetY = (100 - (scaleY * 100)) / 2;
    }

    return (
        <div className="fixed inset-0 -z-10 overflow-hidden">
            {/* Base white background - like an empty wall */}
            <div className="absolute inset-0 bg-black"/>

            {/* Light sources creating full-page illumination */}
            {lights.map((light) => {
                // Apply aspect ratio correction to positioning
                const adjustedX = offsetX + (light.x * scaleX);
                const adjustedY = offsetY + (light.y * scaleY);

                return (
                    <div
                        key={light.id}
                        className="absolute transition-all duration-1000 ease-out"
                        style={{
                            left: `${adjustedX}%`,
                            top: `${adjustedY}%`,
                            transform: 'translate(-50%, -50%)',
                        }}
                    >
                        {/* Large ambient glow that fills the background */}
                        <div
                            className="absolute rounded-full transition-all duration-1000 ease-out"
                            style={{
                                width: `${baseSize}px`,
                                height: `${baseSize}px`,
                                background: `radial-gradient(circle farthest-corner, ${light.color} ${-1 * (5 * (1 - light.brightness) ** 2 + (1 - light.brightness) - 1) * 100}%, transparent 100%)`,
                                filter: 'blur(50px)',
                                transform: 'translate(-50%, -50%)',
                                mixBlendMode: 'difference',
                            }}
                        />
                    </div>
                );
            })}
        </div>
    );
}
