export const rotateX = (point: [number, number, number], angle: number): [number, number, number] => {
  const [x, y, z] = point
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return [x, y * cos - z * sin, y * sin + z * cos]
}

export const rotateY = (point: [number, number, number], angle: number): [number, number, number] => {
  const [x, y, z] = point
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return [x * cos + z * sin, y, -x * sin + z * cos]
}

export const toCameraSpaceFactory = (getRotationX: () => number, getRotationY: () => number) =>
  (point: [number, number, number]): [number, number, number] => {
    let [x, y, z] = point
    ;[x, y, z] = rotateX([x, y, z], getRotationX())
    ;[x, y, z] = rotateY([x, y, z], getRotationY())
    return [x, y, z]
  }

export const project3DFactory = (toCameraSpace: (p: [number, number, number]) => [number, number, number], getZ: () => number) =>
  (point: [number, number, number]): [number, number] => {
    let [x, y, z] = toCameraSpace(point)
    z += getZ()
    const fov = 1000
    const scale = fov / (fov + z)
    return [x * scale + window.innerWidth / 2, y * scale + window.innerHeight / 2]
  }


