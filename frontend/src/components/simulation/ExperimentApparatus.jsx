import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Cylinder, Box, Float, Html, Text } from '@react-three/drei';
import * as THREE from 'three';

export default function ExperimentApparatus({ simulation, onSelect }) {
    const [hovered, setHovered] = useState(false);
    const meshRef = useRef();

    // Animation logic
    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += 0.005;
            if (hovered) {
                meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.05 + 1.25;
            } else {
                meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, 1.2, 0.1);
            }
        }
    });

    const renderModel = () => {
        switch (simulation.id) {
            case 'projectile_motion':
                return (
                    <group scale={0.7} position={[0, -0.2, 0]}>
                        {/* Cannon Base - Bright Red */}
                        <Box args={[0.6, 0.4, 0.8]} position={[0, 0.2, 0]}>
                            <meshStandardMaterial color="#e74c3c" metalness={0.5} roughness={0.5} />
                        </Box>
                        {/* Cannon Tube - Chrome/Silver */}
                        <group rotation={[0, -Math.PI / 4, 0.5]} position={[0, 0.5, 0]}>
                            <Cylinder args={[0.15, 0.18, 1]} rotation={[0, 0, Math.PI / 2]}>
                                <meshStandardMaterial color="#dfe6e9" metalness={1} roughness={0.1} />
                            </Cylinder>
                            {/* Accents - Yellow */}
                            <Cylinder args={[0.19, 0.19, 0.1]} position={[-0.45, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                                <meshStandardMaterial color="#f1c40f" metalness={0.8} />
                            </Cylinder>
                        </group>
                    </group>
                );
            case 'pendulum':
                return (
                    <group scale={0.8} position={[0, -0.1, 0]}>
                        {/* Stand - Dark Blue */}
                        <Cylinder args={[0.02, 0.02, 1.2]} position={[0, 0.5, -0.3]}>
                            <meshStandardMaterial color="#2980b9" metalness={0.8} />
                        </Cylinder>
                        <Box args={[0.4, 0.05, 0.4]} position={[0, -0.1, -0.3]}>
                            <meshStandardMaterial color="#34495e" />
                        </Box>
                        <Cylinder args={[0.02, 0.02, 0.4]} position={[0, 1.1, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
                            <meshStandardMaterial color="#2980b9" metalness={0.8} />
                        </Cylinder>
                        {/* String - White/Silver */}
                        <group position={[0, 1.1, 0.1]}>
                            <Cylinder args={[0.005, 0.005, 1]} position={[0, -0.5, 0]}>
                                <meshStandardMaterial color="#ecf0f1" />
                            </Cylinder>
                            {/* Bob - Bright Red */}
                            <Sphere args={[0.12]} position={[0, -1, 0]}>
                                <meshStandardMaterial color="#c0392b" metalness={0.7} roughness={0.2} />
                            </Sphere>
                        </group>
                    </group>
                );
            case 'spring_mass':
                return (
                    <group scale={0.8} position={[0, -0.1, 0]}>
                        {/* Stand - Yellow */}
                        <Cylinder args={[0.02, 0.02, 1.2]} position={[-0.3, 0.5, 0]}>
                            <meshStandardMaterial color="#f1c40f" metalness={0.8} />
                        </Cylinder>
                        <Box args={[0.2, 0.05, 0.2]} position={[-0.3, 1.1, 0]}>
                            <meshStandardMaterial color="#f39c12" />
                        </Box>
                        {/* Spring Coil - Metallic Silver */}
                        <group position={[0, 1.1, 0]}>
                            {[...Array(12)].map((_, i) => (
                                <mesh key={i} position={[0, -i * 0.05, 0]} rotation={[0, i * 0.5, 0.2]}>
                                    <torusGeometry args={[0.08, 0.01, 8, 24]} />
                                    <meshStandardMaterial color="#bdc3c7" metalness={1} />
                                </mesh>
                            ))}
                        </group>
                        {/* Mass - Bright Purple */}
                        <Box args={[0.25, 0.25, 0.25]} position={[0, 0.4, 0]}>
                            <meshStandardMaterial color="#8e44ad" metalness={0.5} roughness={0.2} />
                            <Html distanceFactor={10} position={[0, 0.3, 0]}>
                                <div className="text-[6px] font-black text-white bg-black/60 px-1 rounded uppercase shadow-xl">1.0kg</div>
                            </Html>
                        </Box>
                    </group>
                );
            case 'collision':
                return (
                    <group scale={0.8} position={[0, 0, 0]}>
                        {/* Track - Orange */}
                        <Box args={[1.8, 0.05, 0.4]} position={[0, 0, 0]}>
                            <meshStandardMaterial color="#d35400" metalness={0.5} />
                        </Box>
                        <Cylinder args={[0.01, 0.01, 1.8]} position={[0, 0.05, 0.1]} rotation={[0, 0, Math.PI / 2]}>
                            <meshStandardMaterial color="#dfe6e9" metalness={1} />
                        </Cylinder>
                        <Cylinder args={[0.01, 0.01, 1.8]} position={[0, 0.05, -0.1]} rotation={[0, 0, Math.PI / 2]}>
                            <meshStandardMaterial color="#dfe6e9" metalness={1} />
                        </Cylinder>
                        {/* Spheres - Emerald and Sunflower */}
                        <Sphere args={[0.13]} position={[-0.5, 0.15, 0]}>
                            <meshStandardMaterial color="#27ae60" metalness={1} roughness={0.1} />
                        </Sphere>
                        <Sphere args={[0.13]} position={[0.5, 0.15, 0]}>
                            <meshStandardMaterial color="#f1c40f" metalness={1} roughness={0.1} />
                        </Sphere>
                    </group>
                );
            default:
                return <Sphere args={[0.3]} />;
        }
    };

    return (
        <group
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            onClick={onSelect}
            className="cursor-pointer"
        >
            <group ref={meshRef} position={[0, 1.2, 0]}>
                {renderModel()}
            </group>

            {/* Label and UI */}
            <Html position={[0, 2.5, 0]} center distanceFactor={12}>
                <div className={`transition-all duration-500 flex flex-col items-center pointer-events-none ${hovered ? 'scale-110 opacity-100' : 'scale-75 opacity-0'}`}>
                    <div className="bg-[#1a1b1e]/95 backdrop-blur-2xl px-5 py-2.5 rounded-2xl border border-white/20 whitespace-nowrap shadow-[0_25px_50px_rgba(0,0,0,0.5)] flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(0,184,148,0.8)]" />
                        <span className="text-[11px] font-black text-white uppercase tracking-[0.25em]">{simulation.title}</span>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                        <div className="bg-primary/20 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black text-primary uppercase tracking-widest border border-primary/20 shadow-lg animate-bounce">
                            ACTIVATE ANALYSIS
                        </div>
                    </div>
                </div>
            </Html>

            {/* Shadow */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 1.02, 0]} receiveShadow>
                <planeGeometry args={[1.2, 1.2]} />
                <meshBasicMaterial color="black" transparent opacity={0.4} />
            </mesh>
        </group>
    );
}
