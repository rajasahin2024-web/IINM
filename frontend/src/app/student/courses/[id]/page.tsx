import { redirect } from "next/navigation";

export default async function StudentCourseIndex({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/student/courses/${id}/overview`);
}
