import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Cylinder, Text, Html } from '@react-three/drei';

export default function Workbench({ position = [0, 0, 0], children }) {
    return (
        <group position={position}>
            {/* Table Frame - Industrial Grey */}
            <Box args={[4.2, 0.1, 2.2]} position={[0, 0.85, 0]}>
                <meshStandardMaterial color="#4a4a4a" metalness={0.8} roughness={0.2} />
            </Box>

            {/* Table Top - Pool Table Green */}
            <Box args={[4, 0.1, 2]} position={[0, 0.95, 0]}>
                <meshStandardMaterial color="#27ae60" roughness={0.8} metalness={0.1} />
            </Box>

            {/* Legs - Chrome */}
            <Cylinder args={[0.08, 0.05, 0.9]} position={[-1.9, 0.45, -0.9]}>
                <meshStandardMaterial color="#dfe6e9" metalness={1} roughness={0.1} />
            </Cylinder>
            <Cylinder args={[0.08, 0.05, 0.9]} position={[1.9, 0.45, -0.9]}>
                <meshStandardMaterial color="#dfe6e9" metalness={1} roughness={0.1} />
            </Cylinder>
            <Cylinder args={[0.08, 0.05, 0.9]} position={[-1.9, 0.45, 0.9]}>
                <meshStandardMaterial color="#dfe6e9" metalness={1} roughness={0.1} />
            </Cylinder>
            <Cylinder args={[0.08, 0.05, 0.9]} position={[1.9, 0.45, 0.9]}>
                <meshStandardMaterial color="#dfe6e9" metalness={1} roughness={0.1} />
            </Cylinder>

            {/* Edge Trim - Brass */}
            <Box args={[4.25, 0.15, 0.05]} position={[0, 0.9, 1.05]}>
                <meshStandardMaterial color="#d4af37" metalness={1} roughness={0.2} />
            </Box>
            <Box args={[4.25, 0.15, 0.05]} position={[0, 0.9, -1.05]}>
                <meshStandardMaterial color="#d4af37" metalness={1} roughness={0.2} />
            </Box>

            {children}
        </group>
    );
}
