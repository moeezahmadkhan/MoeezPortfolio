/** The hero lighting rig, kept in one place so the mood is tunable from one file. */
export function HeroLights() {
  return (
    <>
      <ambientLight intensity={0.35} />
      {/* Key: warm, high and to the camera's left, the way a candle would sit. */}
      <spotLight
        position={[-3.2, 4.2, 3.4]}
        angle={0.5}
        penumbra={0.9}
        intensity={26}
        color="#ffcf94"
      />
      {/* Rim: cold and behind, so the silhouette separates from the dark ground. */}
      <pointLight position={[2.6, 1.4, -2.4]} intensity={12} color="#9fd8ff" />
      {/* Fill: dim, front, keeps the face out of pure silhouette on mobile. */}
      <pointLight position={[0, 0.6, 3.2]} intensity={5} color="#e7c27d" />
    </>
  )
}
