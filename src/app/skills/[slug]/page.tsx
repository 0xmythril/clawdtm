import { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { api } from "../../../../convex/_generated/api";
import { SkillDetailClient } from "./skill-detail-client";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ admin?: string }>;
};

// Generate dynamic metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  
  try {
    const skill = await fetchQuery(api.reviews.getSkillBySlug, { slug });
    
    if (!skill) {
      return {
        title: "Skill Not Found - ClawdTM",
      };
    }

    const title = `${skill.name} - ClawdTM`;
    const description = skill.description || `${skill.name} skill for OpenClaw by ${skill.author}`;
    
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "article",
        url: `https://clawdtm.com/skills/${slug}`,
        siteName: "ClawdTM",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
    };
  } catch {
    return {
      title: "Skill - ClawdTM",
    };
  }
}

export default async function SkillPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { admin } = await searchParams;
  
  // Check if admin override is requested
  const isAdminView = admin === "true";
  
  let skill = null;
  
  if (isAdminView) {
    // Try admin query first (requires auth)
    const { userId } = await auth();
    if (userId) {
      skill = await fetchQuery(api.reviews.getSkillBySlugAdmin, { 
        slug, 
        clerkId: userId 
      });
    }
  }
  
  // Fall back to regular query if admin query didn't return a result
  if (!skill) {
    skill = await fetchQuery(api.reviews.getSkillBySlug, { slug });
  }
  
  if (!skill) {
    notFound();
  }

  return <SkillDetailClient slug={slug} initialSkill={skill} isAdminView={isAdminView} />;
}
