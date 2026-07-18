import * as THREE from 'three'

import type { PartDef } from '../sim/types'

export function standardMaterial(kind: PartDef['material']): THREE.Material {
  switch (kind) {
    case 'wood':
      return new THREE.MeshStandardMaterial({
        color: 0x704526,
        roughness: 0.8,
      })
    case 'bronze':
      return new THREE.MeshStandardMaterial({
        color: 0x708b72,
        metalness: 0.9,
        roughness: 0.35,
      })
    case 'iron':
      return new THREE.MeshStandardMaterial({
        color: 0x292d30,
        metalness: 0.8,
        roughness: 0.5,
      })
    case 'silver':
      return new THREE.MeshStandardMaterial({
        color: 0xf1f3f4,
        metalness: 1,
        roughness: 0.22,
      })
    case 'silk':
      return new THREE.MeshStandardMaterial({
        color: 0xe8ded0,
        roughness: 0.65,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
      })
    case 'clay':
      return new THREE.MeshStandardMaterial({
        color: 0x9b5f3f,
        roughness: 0.9,
      })
    default: {
      const exhaustive: never = kind
      throw new Error(`Unsupported material: ${String(exhaustive)}`)
    }
  }
}
