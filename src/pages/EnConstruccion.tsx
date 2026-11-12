// Página temporal para los apartados de fases siguientes.
export default function EnConstruccion({ titulo, fase }: { titulo: string; fase: number }) {
  return (
    <>
      <h1 className="text-2xl font-bold">{titulo}</h1>
      <p className="mt-4 text-stone-600">Este apartado llega en la fase {fase}.</p>
    </>
  )
}
