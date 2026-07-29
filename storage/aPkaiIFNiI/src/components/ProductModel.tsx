import React from 'react';
import { useThree } from '@react-three/fiber';

const ProductModel = () => {
  const { gl } = useThree();

  return (
    <mesh ref={gl}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#ffffff" />
    </mesh>
  );
};

export default ProductModel;