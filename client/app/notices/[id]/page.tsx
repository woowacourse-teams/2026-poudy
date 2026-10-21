import { NoticeDetailScreen } from "@/components/notices/NoticeDetailScreen";
export default async function Page({ params }: PageProps<"/notices/[id]">) {
  const { id } = await params;
  return <NoticeDetailScreen key={id} id={id} />;
}
