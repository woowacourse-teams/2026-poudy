import { AdminNoticeEditor } from "@/components/admin/AdminNotices";
export default async function Page({ params }: PageProps<"/admin/notices/[id]">) {
  const { id } = await params;
  return <AdminNoticeEditor key={id} id={id === "new" ? undefined : id} />;
}
