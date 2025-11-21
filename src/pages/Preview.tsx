export default function Preview() {
  return (
    <div className="flex-1 bg-[#f5f5f5]">
      <div className="w-full h-full">
        <iframe src="https://www.youtube.com/watch?v=123456" title="Preview" frameBorder={0} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
      </div>
    </div>
  )
}