import React from 'react';
import { useThree } from '@react-three/fiber';

const VirtualStore = () => {
  const { gl } = useThree();

  return (
    <mesh ref={gl}>
      <boxGeometry args={[10, 10, 10]} />
      <meshBasicMaterial color="#ffffff" />
    </mesh>
  );
};

export default VirtualStore;