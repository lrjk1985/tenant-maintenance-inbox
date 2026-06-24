export default function Loading() {
  return (
    <main className="min-h-screen bg-[#f6f7f2] p-4 text-[#17201c] md:p-6">
      <div className="grid min-h-[calc(100vh-3rem)] gap-4 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)_390px]">
        <section className="rounded-md border border-[#d8ddd3] bg-[#fbfcf8]">
          <div className="border-b border-[#d8ddd3] px-4 py-3">
            <div className="h-4 w-24 rounded bg-[#dfe5da]" />
          </div>
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div className="rounded-md border border-[#e4e8df] bg-white p-3" key={index}>
                <div className="h-4 w-32 rounded bg-[#dfe5da]" />
                <div className="mt-3 h-3 w-full rounded bg-[#eef1eb]" />
                <div className="mt-2 h-3 w-3/4 rounded bg-[#eef1eb]" />
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-md border border-[#d8ddd3] bg-white p-5">
          <div className="h-8 w-56 rounded bg-[#dfe5da]" />
          <div className="mt-8 space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                className={`h-20 rounded-md bg-[#eef1eb] ${
                  index % 2 === 0 ? "mr-16" : "ml-16"
                }`}
                key={index}
              />
            ))}
          </div>
        </section>
        <aside className="hidden rounded-md border border-[#d8ddd3] bg-[#fbfcf8] p-4 xl:block">
          <div className="h-5 w-40 rounded bg-[#dfe5da]" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="h-24 rounded-md bg-white" key={index} />
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
