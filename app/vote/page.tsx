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
	const [captions, setCaptions] = useState<Caption[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [user, setUser] = useState<User | null>(null);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [animating, setAnimating] = useState<"left" | "right" | null>(null);
	const supabase = createClient();

	useEffect(() => {
		async function init() {
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) {
				router.replace("/login");
				return;
			}

			setUser(user);

			const { data, error } = await supabase
				.from("captions")
				.select(
					`
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
				`,
				)

				.not("content", "is", null)
				.order("created_datetime_utc", { ascending: false });

			if (error) {
				setError(error.message);
				setLoading(false);
				return;
			}

			let allCaptions = (data as unknown as Caption[]) || [];

			// Filter out captions the user has already voted on
			if (user) {
				const { data: myVotes } = await supabase
					.from("caption_votes")
					.select("caption_id")
					.eq("profile_id", user.id);

				const votedIds = new Set(
					(myVotes || []).map((v) => v.caption_id),
				);
				allCaptions = allCaptions.filter((c) => !votedIds.has(c.id));
			}

			// Shuffle so the user sees a varied order each session
			for (let i = allCaptions.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[allCaptions[i], allCaptions[j]] = [allCaptions[j], allCaptions[i]];
			}

			setCaptions(allCaptions);

			setLoading(false);
		}

		init();
	}, [supabase]);

	const handleVote = useCallback(
		async (voteValue: 1 | -1) => {
			if (!user || captions.length === 0 || animating) return;

			const caption = captions[currentIndex];
			if (!caption) return;

			const { error } = await supabase.from("caption_votes").insert({
				profile_id: user.id,
				caption_id: caption.id,
				vote_value: voteValue,
				created_datetime_utc: new Date().toISOString(),
			});

			if (!error) {
				setAnimating(voteValue === 1 ? "right" : "left");
				setTimeout(() => {
					setCurrentIndex((prev) => prev + 1);
					setAnimating(null);
				}, 300);
			}
		},
		[user, captions, currentIndex, animating, supabase],
	);

	// Keyboard bindings: ArrowRight for check (upvote), ArrowLeft for X (downvote)
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "ArrowRight") {
				e.preventDefault();
				handleVote(1);
			} else if (e.key === "ArrowLeft") {
				e.preventDefault();
				handleVote(-1);
			}
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [handleVote]);

	const currentCaption = captions[currentIndex];
	const remaining = captions.length - currentIndex;
	const allDone = !loading && !error && remaining <= 0;

	return (
		<main
			style={{
				minHeight: "100vh",
				background: "#1a1a2e",
				fontFamily: "system-ui, sans-serif",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
			}}>
			{loading && (
				<p style={{ color: "#8888aa", marginTop: "4rem" }}>Loading...</p>
			)}
			{error && (
				<p style={{ color: "#ff6b6b", marginTop: "4rem" }}>
					Error: {error}
				</p>
			)}

			{allDone && (
				<div
					style={{
						marginTop: "4rem",
						textAlign: "center",
						color: "#8888aa",
					}}>
					<p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
						All done!
					</p>
					<p style={{ fontSize: "0.95rem" }}>
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
						background: "#16213e",
						borderRadius: "40px",
						border: "3px solid #2a2a4a",
						marginTop: "0.5rem",
						display: "flex",
						flexDirection: "column",
						overflow: "hidden",
						boxShadow:
							"0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
						position: "relative",
					}}>
					{/* Notch */}
					<div
						style={{
							width: "120px",
							height: "28px",
							background: "#1a1a2e",
							borderRadius: "0 0 16px 16px",
							margin: "0 auto",
						}}
					/>

					{/* Remaining count */}
					<div
						style={{
							textAlign: "center",
							padding: "6px 0 2px",
						}}>
						<span
							style={{
								fontSize: "0.75rem",
								color: "#5a5a7a",
							}}>
							{remaining} remaining
						</span>
					</div>

					{/* Card content */}
					<div
						style={{
							flex: 1,
							padding: "0.75rem 1.25rem",
							display: "flex",
							flexDirection: "column",
							transition: animating
								? "transform 0.3s ease, opacity 0.3s ease"
								: "none",
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
								borderRadius: "16px",
								overflow: "hidden",
								boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
							}}>
							<img
								src={currentCaption.images.url}
								alt={
									currentCaption.images.image_description ||
									"Image"
								}
								style={{
									width: "100%",
									display: "block",
									maxHeight: "320px",
									objectFit: "cover",
								}}
							/>
						</div>

						{/* Caption text */}
						<div style={{ padding: "1rem 0.5rem", flex: 1 }}>
							<p
								style={{
									margin: 0,
									fontSize: "1.15rem",
									lineHeight: 1.6,
									color: "#f0f0ff",
									fontWeight: 500,
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
									border: "2px solid #3a3a5a",
									background: "rgba(255,255,255,0.03)",
									cursor: "pointer",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									fontSize: "1.5rem",
									color: "#ff6b6b",
									transition: "all 0.15s ease",
								}}>
								&#x2717;
							</button>

							{/* Check / Upvote */}
							<button
								onClick={() => handleVote(1)}
								style={{
									width: "64px",
									height: "64px",
									borderRadius: "50%",
									border: "2px solid #3a3a5a",
									background: "rgba(255,255,255,0.03)",
									cursor: "pointer",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									fontSize: "1.5rem",
									color: "#4ecdc4",
									transition: "all 0.15s ease",
								}}>
								&#x2713;
							</button>
						</div>
					</div>

					{/* Home indicator */}
					<div
						style={{
							width: "120px",
							height: "4px",
							background: "#3a3a5a",
							borderRadius: "2px",
							margin: "0 auto 8px",
						}}
					/>
				</div>
			)}

			{/* Keyboard hint */}
			{!loading && !error && currentCaption && (
				<p
					style={{
						marginTop: "1.25rem",
						fontSize: "0.8rem",
						color: "#5a5a7a",
					}}>
					<kbd
						style={{
							padding: "2px 8px",
							background: "#2a2a4a",
							borderRadius: "4px",
							border: "1px solid #3a3a5a",
							color: "#ff6b6b",
						}}>
						&#8592;
					</kbd>{" "}
					reject{" "}
					<span style={{ margin: "0 0.5rem", color: "#3a3a5a" }}>
						|
					</span>{" "}
					approve{" "}
					<kbd
						style={{
							padding: "2px 8px",
							background: "#2a2a4a",
							borderRadius: "4px",
							border: "1px solid #3a3a5a",
							color: "#4ecdc4",
						}}>
						&#8594;
					</kbd>
				</p>
			)}
		</main>
	);
}
