"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type Caption = {
	id: string;
	content: string;
	created_datetime_utc: string;
	like_count: number;
	image_id: string;
	images: {
		id: string;
		url: string;
		image_description: string | null;
	};
};

export default function VotePage() {
	const router = useRouter();
	const [captions, setCaptions]     = useState<Caption[]>([]);
	const [loading, setLoading]       = useState(true);
	const [error, setError]           = useState<string | null>(null);
	const [user, setUser]             = useState<User | null>(null);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [animating, setAnimating]   = useState<"left" | "right" | null>(null);
	const supabase = createClient();

	useEffect(() => {
		async function init() {
			const { data: { user } } = await supabase.auth.getUser();

			if (!user) { router.replace("/login"); return; }
			setUser(user);

			// Only wall-e flavor (id: 377) for voting
			const { data, error } = await supabase
				.from("captions")
				.select(`
					id,
					content,
					created_datetime_utc,
					like_count,
					image_id,
					images!inner (
						id,
						url,
						image_description
					)
				`)
				.eq("humor_flavor_id", 377)
				.not("content", "is", null)
				.order("created_datetime_utc", { ascending: false });

			if (error) { setError(error.message); setLoading(false); return; }

			let allCaptions = (data as unknown as Caption[]) || [];

			// Filter out already-voted captions
			const { data: myVotes } = await supabase
				.from("caption_votes")
				.select("caption_id")
				.eq("profile_id", user.id);

			const votedIds = new Set((myVotes || []).map((v) => v.caption_id));
			allCaptions = allCaptions.filter((c) => !votedIds.has(c.id));

			// Shuffle for variety
			for (let i = allCaptions.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[allCaptions[i], allCaptions[j]] = [allCaptions[j], allCaptions[i]];
			}

			setCaptions(allCaptions);
			setLoading(false);
		}

		init();
	}, [supabase, router]);

	const handleVote = useCallback(
		async (voteValue: 1 | -1) => {
			if (!user || captions.length === 0 || animating) return;
			const caption = captions[currentIndex];
			if (!caption) return;

			const { error } = await supabase.from("caption_votes").insert({
				profile_id:           user.id,
				caption_id:           caption.id,
				vote_value:           voteValue,
				created_by_user_id:   user.id,
				modified_by_user_id:  user.id,
			});

			if (!error) {
				setAnimating(voteValue === 1 ? "right" : "left");
				setTimeout(() => { setCurrentIndex((prev) => prev + 1); setAnimating(null); }, 300);
			}
		},
		[user, captions, currentIndex, animating, supabase],
	);

	// Arrow key bindings
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "ArrowRight") { e.preventDefault(); handleVote(1);  }
			if (e.key === "ArrowLeft")  { e.preventDefault(); handleVote(-1); }
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [handleVote]);

	const currentCaption = captions[currentIndex];
	const remaining      = captions.length - currentIndex;
	const allDone        = !loading && !error && remaining <= 0;

	return (
		<main
			style={{
				minHeight: "100vh",
				fontFamily: "inherit",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				paddingTop: "1rem",
			}}>
			{loading && (
				<p style={{ color: "#2e6070", marginTop: "4rem", letterSpacing: "0.12em" }}>
					LOADING…
				</p>
			)}
			{error && (
				<p style={{ color: "#ff6600", marginTop: "4rem", letterSpacing: "0.06em" }}>
					ERROR: {error}
				</p>
			)}

			{allDone && (
				<div style={{ marginTop: "4rem", textAlign: "center" }}>
					<p style={{ fontSize: "2rem", marginBottom: "0.5rem", color: "#00f0ff", letterSpacing: "0.1em", animation: "textGlowPulse 3s ease-in-out infinite" }}>
						ALL DONE
					</p>
					<p style={{ fontSize: "0.85rem", color: "#2e6070", letterSpacing: "0.08em" }}>
						No more captions to vote on.
					</p>
				</div>
			)}

			{/* Phone frame */}
			{!loading && !error && currentCaption && (
				<div
					style={{
						width: "375px",
						minHeight: "680px",
						background: "#000f1e",
						borderRadius: "40px",
						border: "2px solid rgba(0, 240, 255, 0.28)",
						marginTop: "0.5rem",
						display: "flex",
						flexDirection: "column",
						overflow: "hidden",
						boxShadow: "0 0 40px rgba(0,240,255,0.1), 0 0 80px rgba(0,240,255,0.04), inset 0 0 20px rgba(0,240,255,0.02)",
						position: "relative",
						animation: "glowPulse 4s ease-in-out infinite",
					}}>
					{/* Notch */}
					<div
						style={{
							width: "120px",
							height: "28px",
							background: "#000810",
							borderRadius: "0 0 16px 16px",
							margin: "0 auto",
							borderBottom: "1px solid rgba(0,240,255,0.12)",
						}}
					/>

					{/* Remaining count */}
					<div style={{ textAlign: "center", padding: "6px 0 2px" }}>
						<span style={{ fontSize: "0.72rem", color: "#2e6070", letterSpacing: "0.1em" }}>
							{remaining} REMAINING
						</span>
					</div>

					{/* Card content */}
					<div
						style={{
							flex: 1,
							padding: "0.75rem 1.25rem",
							display: "flex",
							flexDirection: "column",
							transition: animating ? "transform 0.3s ease, opacity 0.3s ease" : "none",
							transform: animating
								? animating === "left"
									? "translateX(-120%) rotate(-8deg)"
									: "translateX(120%) rotate(8deg)"
								: "translateX(0)",
							opacity: animating ? 0 : 1,
						}}>
						{/* Image */}
						<div
							style={{
								borderRadius: "12px",
								overflow: "hidden",
								border: "1px solid rgba(0,240,255,0.15)",
								boxShadow: "0 0 20px rgba(0,240,255,0.08)",
							}}>
							<img
								src={currentCaption.images.url}
								alt={currentCaption.images.image_description || "Image"}
								style={{ width: "100%", display: "block", maxHeight: "320px", objectFit: "cover" }}
							/>
						</div>

						{/* Divider */}
						<div style={{ height: "1px", background: "rgba(0,240,255,0.1)", margin: "1rem 0 0.75rem" }}/>

						{/* Caption */}
						<div style={{ flex: 1, paddingBottom: "0.5rem" }}>
							<p
								style={{
									margin: 0,
									fontSize: "1.1rem",
									lineHeight: 1.65,
									color: "#c0ecff",
									fontWeight: 500,
									letterSpacing: "0.02em",
								}}>
								{currentCaption.content}
							</p>
						</div>

						{/* Vote buttons */}
						<div
							style={{
								display: "flex",
								justifyContent: "center",
								alignItems: "center",
								gap: "2.5rem",
								paddingBottom: "1.25rem",
							}}>
							{/* X / Downvote */}
							<button
								onClick={() => handleVote(-1)}
								style={{
									width: "64px",
									height: "64px",
									borderRadius: "50%",
									border: "2px solid rgba(255, 102, 0, 0.3)",
									background: "rgba(255, 102, 0, 0.05)",
									cursor: "pointer",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									fontSize: "1.5rem",
									color: "#ff6600",
									animation: "orangeGlowPulse 3.5s ease-in-out infinite",
									transition: "transform 0.1s ease",
								}}>
								✗
							</button>

							{/* ✓ / Upvote */}
							<button
								onClick={() => handleVote(1)}
								style={{
									width: "64px",
									height: "64px",
									borderRadius: "50%",
									border: "2px solid rgba(0, 240, 255, 0.3)",
									background: "rgba(0, 240, 255, 0.05)",
									cursor: "pointer",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									fontSize: "1.5rem",
									color: "#00f0ff",
									animation: "glowPulse 3s ease-in-out infinite",
									transition: "transform 0.1s ease",
								}}>
								✓
							</button>
						</div>
					</div>

					{/* Home indicator */}
					<div
						style={{
							width: "100px",
							height: "3px",
							background: "rgba(0,240,255,0.2)",
							borderRadius: "2px",
							margin: "0 auto 10px",
							boxShadow: "0 0 6px rgba(0,240,255,0.2)",
						}}
					/>
				</div>
			)}

			{/* Keyboard hint */}
			{!loading && !error && currentCaption && (
				<p style={{ marginTop: "1.25rem", fontSize: "0.75rem", color: "#2e6070", letterSpacing: "0.08em" }}>
					<kbd
						style={{
							padding: "2px 8px",
							background: "rgba(255,102,0,0.08)",
							borderRadius: "3px",
							border: "1px solid rgba(255,102,0,0.3)",
							color: "#ff6600",
							fontFamily: "inherit",
						}}>
						←
					</kbd>{" "}
					REJECT
					<span style={{ margin: "0 0.75rem", color: "rgba(0,240,255,0.15)" }}>|</span>
					APPROVE{" "}
					<kbd
						style={{
							padding: "2px 8px",
							background: "rgba(0,240,255,0.06)",
							borderRadius: "3px",
							border: "1px solid rgba(0,240,255,0.3)",
							color: "#00f0ff",
							fontFamily: "inherit",
						}}>
						→
					</kbd>
				</p>
			)}
		</main>
	);
}
