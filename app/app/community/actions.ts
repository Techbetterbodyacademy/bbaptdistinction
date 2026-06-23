"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prepareCommunityPost, prepareCommunityComment } from "@/lib/community";

export async function createPost(formData: FormData) {
  const prepared = prepareCommunityPost({ body: String(formData.get("body") ?? "") });
  if (!prepared.ok) redirect(`/app/community?error=${encodeURIComponent(prepared.error)}`);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  await supabase.from("community_post").insert({
    workspace_id: workspace!.id,
    author_user_id: user.id,
    body: prepared.record.body
  });

  revalidatePath("/app/community");
  redirect("/app/community?saved=1");
}

export async function toggleLike(formData: FormData) {
  const postId = String(formData.get("post_id") ?? "");
  if (!postId) redirect("/app/community");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("community_like")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase.from("community_like").delete().eq("post_id", postId).eq("user_id", user.id);
  } else {
    await supabase.from("community_like").insert({ post_id: postId, user_id: user.id });
  }

  revalidatePath("/app/community");
  redirect("/app/community");
}

export async function addComment(formData: FormData) {
  const postId = String(formData.get("post_id") ?? "");
  const prepared = prepareCommunityComment({ body: String(formData.get("body") ?? "") });
  if (!postId || !prepared.ok) redirect("/app/community");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("community_comment").insert({
    post_id: postId,
    author_user_id: user.id,
    body: prepared.record.body
  });

  revalidatePath("/app/community");
  redirect("/app/community");
}
