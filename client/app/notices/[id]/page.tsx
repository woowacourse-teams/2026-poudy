import { NoticesScreen } from "@/components/notices/NoticesScreen";
export default async function Page({ params }: PageProps<"/notices/[id]">) {
  const { id } = await params;
  return <NoticesScreen key={id} id={id} />;
}
