import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Stars } from '@react-three/drei';
import * as THREE from 'three';
import type { Company } from '../types';

type Drag = { active: boolean; x: number };

function Floor({ company, y, selected, onSelect }: { company: Company; y: number; selected: boolean; onSelect: (f: number) => void }) {
  const ref = useRef<THREE.Group>(null);
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(3.1, 0.52, 3.1)), []);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.35 + company.floor) * 0.035;
  });
  return (
    <group ref={ref} position={[0, y, 0]} onClick={(e) => { e.stopPropagation(); onSelect(company.floor); }}>
      <mesh>
        <boxGeometry args={[3.1, 0.52, 3.1]} />
        <meshStandardMaterial
          color={selected ? '#16283a' : '#101924'}
          metalness={0.65}
          roughness={0.3}
          emissive={selected ? company.accent : '#000000'}
          emissiveIntensity={selected ? 0.32 : 0}
        />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={company.accent} transparent opacity={selected ? 0.95 : 0.34} />
      </lineSegments>
      <mesh position={[0, -0.32, 0]}>
        <boxGeometry args={[2.2, 0.12, 2.2]} />
        <meshStandardMaterial color={company.accent} emissive={company.accent} emissiveIntensity={selected ? 1.4 : 0.4} transparent opacity={0.5} />
      </mesh>
      <Html position={[2.15, 0, 0]} center distanceFactor={9} zIndexRange={[10, 0]}>
        <button
          className={`floor-tag ${selected ? 'is-selected' : ''}`}
          style={{ '--tag': company.accent } as React.CSSProperties}
          onClick={(e) => { e.stopPropagation(); onSelect(company.floor); }}
          aria-label={`Floor ${company.floor}, ${company.name}`}
        >
          <span className="floor-tag-num">{String(company.floor).padStart(2, '0')}</span>
          <span>{company.name}</span>
        </button>
      </Html>
    </group>
  );
}

function Elevator({ y }: { y: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.position.y = THREE.MathUtils.damp(ref.current.position.y, y, 3, delta);
  });
  return (
    <mesh ref={ref} position={[0, y, 0]}>
      <boxGeometry args={[0.34, 0.34, 0.34]} />
      <meshStandardMaterial color="#ffffff" emissive="#67e8dc" emissiveIntensity={2.4} />
    </mesh>
  );
}

function Rig({ y }: { y: number }) {
  const { camera } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  const desired = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, delta) => {
    desired.set(7.4, y + 2.7, 8.4);
    camera.position.lerp(desired, Math.min(1, delta * 2.2));
    target.set(0, y, 0);
    camera.lookAt(target);
  });
  return null;
}

function Structure({ companies, selectedFloor, onSelect, spin, drag }: {
  companies: Company[];
  selectedFloor: number;
  onSelect: (f: number) => void;
  spin: React.RefObject<number>;
  drag: React.RefObject<Drag>;
}) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!drag.current.active) spin.current += delta * 0.055;
    if (group.current) group.current.rotation.y = spin.current;
  });
  const step = 1.05;
  return (
    <group ref={group}>
      <mesh position={[0, 3.1, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 7.6, 16]} />
        <meshStandardMaterial color="#223243" metalness={0.9} roughness={0.2} transparent opacity={0.55} />
      </mesh>
      {companies.map((c) => <Floor key={c.id} company={c} y={(c.floor - 1) * step} selected={c.floor === selectedFloor} onSelect={onSelect} />)}
      <mesh position={[0, 5.65, 0]}>
        <coneGeometry args={[0.5, 0.9, 4]} />
        <meshStandardMaterial color="#0f1a26" emissive="#f6c177" emissiveIntensity={0.55} metalness={0.7} roughness={0.3} />
      </mesh>
      <pointLight position={[0, 6.2, 0]} color="#f6c177" intensity={9} distance={9} />
      <Elevator y={(selectedFloor - 1) * step} />
    </group>
  );
}

export default function Tower3D({ companies, selectedFloor, onSelect }: { companies: Company[]; selectedFloor: number; onSelect: (f: number) => void }) {
  const spin = useRef(0);
  const drag = useRef<Drag>({ active: false, x: 0 });
  return (
    <div
      className="tower-canvas"
      role="application"
      aria-label="Interactive 3D tower. Drag to rotate; choose a floor from the floor list."
      onPointerDown={(e) => { drag.current.active = true; drag.current.x = e.clientX; }}
      onPointerMove={(e) => { if (drag.current.active) { spin.current += (e.clientX - drag.current.x) * 0.008; drag.current.x = e.clientX; } }}
      onPointerUp={() => { drag.current.active = false; }}
      onPointerLeave={() => { drag.current.active = false; }}
    >
      <Canvas dpr={[1, 1.6]} camera={{ position: [7.4, 7.6, 8.4], fov: 38 }} gl={{ antialias: true }}>
        <color attach="background" args={['#080b12']} />
        <fog attach="fog" args={['#080b12', 12, 30]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[6, 10, 5]} intensity={1.6} color="#cfe8ff" />
        <pointLight position={[-6, 2, -4]} intensity={22} distance={20} color="#3d7cff" />
        <Stars radius={55} depth={25} count={900} factor={3} fade speed={0.35} />
        <gridHelper args={[30, 30, '#18313d', '#0c141d']} position={[0, -1.35, 0]} />
        <Structure companies={companies} selectedFloor={selectedFloor} onSelect={onSelect} spin={spin} drag={drag} />
        <Rig y={(selectedFloor - 1) * 1.05} />
      </Canvas>
    </div>
  );
}
