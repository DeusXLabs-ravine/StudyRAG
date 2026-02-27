import { Suspense, useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows, Float, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import Workbench from './Workbench';
import ExperimentApparatus from './ExperimentApparatus';

function Scene({ simulations, onSelect }) {
    const groupRef = useRef();

    return (
        <group ref={groupRef}>
            {/* Floor with industrial grid */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial color="#f1f3f5" />
            </mesh>
            <gridHelper args={[100, 100, 0xdde2e5, 0xebedf0]} position={[0, 0, 0]} />

            {/* Lab Workbenches */}
            {simulations && simulations.length > 0 && (
                <group position={[0, 0, -2]}>
                    <Workbench position={[-3.5, 0, 0]}>
                        {simulations[0] && <ExperimentApparatus simulation={simulations[0]} onSelect={() => onSelect(simulations[0].id)} />}
                    </Workbench>
                    <Workbench position={[3.5, 0, 0]}>
                        {simulations[1] && <ExperimentApparatus simulation={simulations[1]} onSelect={() => onSelect(simulations[1].id)} />}
                    </Workbench>
                    <Workbench position={[-3.5, 0, 5]}>
                        {simulations[2] && <ExperimentApparatus simulation={simulations[2]} onSelect={() => onSelect(simulations[2].id)} />}
                    </Workbench>
                    <Workbench position={[3.5, 0, 5]}>
                        {simulations[3] && <ExperimentApparatus simulation={simulations[3]} onSelect={() => onSelect(simulations[3].id)} />}
                    </Workbench>
                </group>
            )}

            {/* Laboratory Title */}
            <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
                <Text
                    position={[0, 6, -8]}
                    fontSize={1.5}
                    color="#0984e3"
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.05}
                    outlineColor="#ffffff"
                >
                    PHYSICS RESEARCH WING
                </Text>
            </Float>

            <Text
                position={[0, 5.2, -8]}
                fontSize={0.3}
                color="#636e72"
                anchorX="center"
                anchorY="middle"
            >
                INSTITUTIONAL GRADE COMPUTATIONAL ENVIRONMENT
            </Text>
        </group>
    );
}

export default function PhysicsLab3D({ simulations, onSelect }) {
    return (
        <div className="w-full h-[700px] bg-[#f8f9fa] rounded-[2.5rem] overflow-hidden border-2 border-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] relative">
            <div className="absolute top-8 left-8 z-10 flex flex-col gap-2 pointer-events-none">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <span className="text-white font-black text-lg">3D</span>
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-gray-900 uppercase tracking-[0.4em]">Spatial Workspace</h2>
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                            Telemetry Active
                        </p>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-8 text-[10px] font-black text-gray-500 uppercase tracking-[0.25em] bg-white/90 backdrop-blur-2xl px-8 py-4 rounded-[1.5rem] border border-white shadow-2xl">
                <div className="flex items-center gap-3">
                    <span className="text-primary px-2 py-0.5 rounded bg-primary/5 border border-primary/10">DRAG</span>
                    to explore
                </div>
                <div className="w-px h-4 bg-gray-200" />
                <div className="flex items-center gap-3">
                    <span className="text-primary px-2 py-0.5 rounded bg-primary/5 border border-primary/10">SCROLL</span>
                    to zoom
                </div>
                <div className="w-px h-4 bg-gray-200" />
                <div className="flex items-center gap-3">
                    <span className="text-primary px-2 py-0.5 rounded bg-primary/5 border border-primary/10">CLICK</span>
                    to initialize
                </div>
            </div>

            <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 12, 18], fov: 35 }}>
                <Suspense fallback={<Html center><div className="flex flex-col items-center gap-4"><div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin" /><div className="text-xs font-black text-gray-400 uppercase tracking-widest">Constructing Scene...</div></div></Html>}>
                    <OrbitControls
                        enablePan={false}
                        maxPolarAngle={Math.PI / 2.1}
                        minDistance={8}
                        maxDistance={35}
                        dampingFactor={0.05}
                    />

                    <Scene simulations={simulations} onSelect={onSelect} />

                    <ambientLight intensity={0.6} />
                    <spotLight position={[15, 20, 15]} angle={0.3} penumbra={1} intensity={2} castShadow />
                    <pointLight position={[-10, 10, -10]} intensity={1} color="#3498db" />
                    <directionalLight position={[10, 10, 5]} intensity={1} />
                    <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={30} blur={2} far={10} />
                </Suspense>
            </Canvas>
        </div>
    );
}
