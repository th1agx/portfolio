import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { device } from '../../global/device'

/** Poeira flutuando no feixe do abajur. Só ela se mexe quando nada mais se mexe. */
export function Dust() {
  const count = device.lowPower ? 160 : 420
  const points = useRef<THREE.Points>(null)
  const { geo, mat } = useMemo(() => {
    const pos = new Float32Array(count * 3), seed = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.4) * 5
      pos[i * 3 + 1] = (Math.random() - 0.5) * 2.4
      pos[i * 3 + 2] = Math.random() * 2.2 - 0.6
      seed[i] = Math.random()
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `attribute float aSeed; uniform float uTime; varying float vA;
        void main(){ vec3 p = position; p.y += mod(uTime*0.02*(0.4+aSeed) + aSeed*2.4, 2.4) - 1.2 - position.y*0.0;
          p.x += sin(uTime*0.2 + aSeed*30.0)*0.05;
          vec4 mv = modelViewMatrix * vec4(p,1.0); gl_PointSize = (1.0 + aSeed*2.0) * (3.0 / -mv.z);
          vA = 0.25 + 0.5*aSeed; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord-0.5); gl_FragColor = vec4(1.0,0.9,0.75, smoothstep(0.5,0.0,d)*vA); }`,
    })
    return { geo, mat }
  }, [count])
  useFrame((_, dt) => { if (!device.reducedMotion) mat.uniforms.uTime.value += dt })
  return <points ref={points} geometry={geo} material={mat} />
}
