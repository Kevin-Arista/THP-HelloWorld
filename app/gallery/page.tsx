"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const PAGE_SIZE = 12;

type ViewMode = "latest" | "flavor";

type Flavor = { id: number; slug: string };

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

type VoteCounts = Record<string, { up: number; down: number }>;

function formatDate(iso: string) {
	return new Date(iso).toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function PaginationBar({
	page,
	totalPages,
	onPage,
}: {
	page: number;
	totalPages: number;
	onPage: (p: number) => void;
}) {
	if (totalPages <= 1) return null;

	const pages: (number | "…")[] = [];
	const delta = 2;
	const left  = page - delta;
	const right = page + delta;

	for (let i = 0; i < totalPages; i++) {
		if (i === 0 || i === totalPages - 1 || (i >= left && i <= right)) {
			pages.push(i);
		} else if (
			(i === left - 1 && left > 1) ||
			(i === right + 1 && right < totalPages - 2)
		) {
			pages.push("…");
		}
	}

	const btnBase: React.CSSProperties = {
		height: "34px",
		borderRadius: "3px",
		border: "1px solid rgba(0, 240, 255, 0.2)",
		background: "rgba(0, 240, 255, 0.04)",
		color: "#2e6070",
		cursor: "pointer",
		fontSize: "0.78rem",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		fontFamily: "inherit",
		letterSpacing: "0.05em",
	};

	return (
		<div
			style={{
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
				gap: "0.35rem",
				marginTop: "2.5rem",
				flexWrap: "wrap",
			}}>
			<button
				onClick={() => onPage(page - 1)}
				disabled={page === 0}
				style={{
					...btnBase,
					padding: "0 0.85rem",
					color: page === 0 ? "rgba(0,240,255,0.15)" : "#2e6070",
					cursor: page === 0 ? "default" : "pointer",
				}}>
				← PREV
			</button>

			{pages.map((p, idx) =>
				p === "…" ? (
					<span
						key={`ellipsis-${idx}`}
						style={{ color: "rgba(0,240,255,0.2)", padding: "0 0.25rem", lineHeight: "34px" }}>
						…
					</span>
				) : (
					<button
						key={p}
						onClick={() => onPage(p)}
						style={{
							...btnBase,
							width: "34px",
							border: `1px solid ${p === page ? "rgba(0,240,255,0.65)" : "rgba(0,240,255,0.2)"}`,
							background: p === page ? "rgba(0, 240, 255, 0.12)" : "rgba(0,240,255,0.04)",
							color: p === page ? "#00f0ff" : "#2e6070",
							cursor: p === page ? "default" : "pointer",
							fontWeight: p === page ? 700 : 400,
							boxShadow: p === page ? "0 0 8px rgba(0,240,255,0.3)" : "none",
						}}>
						{p + 1}
					</button>
				),
			)}

			<button
				onClick={() => onPage(page + 1)}
				disabled={page === totalPages - 1}
				style={{
					...btnBase,
					padding: "0 0.85rem",
					color: page === totalPages - 1 ? "rgba(0,240,255,0.15)" : "#2e6070",
					cursor: page === totalPages - 1 ? "default" : "pointer",
				}}>
				NEXT →
			</button>
		</div>
	);
}

export default function GalleryPage() {
	const [captions, setCaptions]         = useState<Caption[]>([]);
	const [voteCounts, setVoteCounts]     = useState<VoteCounts>({});
	const [loading, setLoading]           = useState(true);
	const [error, setError]               = useState<string | null>(null);
	const [page, setPage]                 = useState(0);
	const [total, setTotal]               = useState(0);
	const [viewMode, setViewMode]         = useState<ViewMode>("latest");
	const [selectedFlavorId, setSelectedFlavorId] = useState<number | null>(null);
	const [flavors, setFlavors]           = useState<Flavor[]>([]);
	const [user, setUser]                 = useState<User | null>(null);
	const supabase = createClient();

	const totalPages = Math.ceil(total / PAGE_SIZE);

	// Auth listener
	useEffect(() => {
		const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
			setUser(session?.user ?? null);
		});
		return () => subscription.unsubscribe();
	}, [supabase]);

	// Fetch flavor list once on mount
	useEffect(() => {
		supabase
			.from("humor_flavors")
			.select("id, slug")
			.order("slug", { ascending: true })
			.then(({ data }) => {
				setFlavors((data || []) as Flavor[]);
			});
	}, [supabase]);

	const fetchCaptions = useCallback(
		async (pageIndex: number, mode: ViewMode, flavorId: number | null) => {
			setLoading(true);
			setError(null);
			const from = pageIndex * PAGE_SIZE;
			const to   = from + PAGE_SIZE - 1;

			if (mode === "latest") {
				// All captions, newest first — no flavor filter
				const { data, error, count } = await supabase
					.from("captions")
					.select(
						`id, content, created_datetime_utc, like_count, image_id,
						images!inner (id, url, image_description)`,
						{ count: "exact" },
					)
					.not("content", "is", null)
					.order("created_datetime_utc", { ascending: false })
					.range(from, to);

				if (error) { setError(error.message); setLoading(false); return; }

				const captionRows = (data as unknown as Caption[]) || [];
				setCaptions(captionRows);
				setTotal(Math.min(count ?? 0, PAGE_SIZE * 10));

				if (captionRows.length > 0) {
					const ids = captionRows.map((c) => c.id);
					const { data: votes } = await supabase
						.from("caption_votes")
						.select("caption_id, vote_value")
						.in("caption_id", ids);

					const counts: VoteCounts = {};
					(votes || []).forEach((v) => {
						if (!counts[v.caption_id]) counts[v.caption_id] = { up: 0, down: 0 };
						if (v.vote_value > 0) counts[v.caption_id].up++;
						else counts[v.caption_id].down++;
					});
					setVoteCounts(counts);
				} else {
					setVoteCounts({});
				}

				setLoading(false);
				return;
			}

			// Flavor mode — filter by selected flavor, sort by top voted (like_count desc)
			if (mode === "flavor" && flavorId !== null) {
				const { data, error, count } = await supabase
					.from("captions")
					.select(
						`id, content, created_datetime_utc, like_count, image_id,
						images!inner (id, url, image_description)`,
						{ count: "exact" },
					)
					.eq("humor_flavor_id", flavorId)
					.not("content", "is", null)
					.order("like_count", { ascending: false })
					.range(from, to);

				if (error) { setError(error.message); setLoading(false); return; }

				const captionRows = (data as unknown as Caption[]) || [];
				setCaptions(captionRows);
				setTotal(count ?? 0);

				if (captionRows.length > 0) {
					const ids = captionRows.map((c) => c.id);
					const { data: votes } = await supabase
						.from("caption_votes")
						.select("caption_id, vote_value")
						.in("caption_id", ids);

					const counts: VoteCounts = {};
					(votes || []).forEach((v) => {
						if (!counts[v.caption_id]) counts[v.caption_id] = { up: 0, down: 0 };
						if (v.vote_value > 0) counts[v.caption_id].up++;
						else counts[v.caption_id].down++;
					});
					setVoteCounts(counts);
				} else {
					setVoteCounts({});
				}

				setLoading(false);
			}
		},
		[supabase],
	);

	useEffect(() => {
		fetchCaptions(page, viewMode, selectedFlavorId);
	}, [page, viewMode, selectedFlavorId, fetchCaptions]);

	function handleLatest() {
		setViewMode("latest");
		setSelectedFlavorId(null);
		setPage(0);
	}

	function handleFlavorChange(e: React.ChangeEvent<HTMLSelectElement>) {
		const id = parseInt(e.target.value);
		if (!isNaN(id)) {
			setSelectedFlavorId(id);
			setViewMode("flavor");
			setPage(0);
		}
	}

	function handlePage(p: number) {
		setPage(p);
		window.scrollTo({ top: 0, behavior: "smooth" });
	}

	const activeFlavor = flavors.find((f) => f.id === selectedFlavorId);

	return (
		<main
			style={{
				padding: "2rem",
				fontFamily: "inherit",
				maxWidth: "1400px",
				margin: "0 auto",
			}}>
			{/* Header */}
			<div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
				<h1
					style={{
						margin: "0 0 0.5rem",
						fontSize: "1.6rem",
						color: "#00f0ff",
						letterSpacing: "0.2em",
						animation: "textGlowPulse 4s ease-in-out infinite",
					}}>
					GALLERY
				</h1>
				{user ? (
					<Link
						href="/vote"
						style={{
							display: "inline-block",
							marginTop: "0.5rem",
							padding: "0.55rem 1.5rem",
							fontSize: "0.85rem",
							fontWeight: 700,
							letterSpacing: "0.1em",
							color: "#000810",
							background: "#00f0ff",
							borderRadius: "3px",
							textDecoration: "none",
							boxShadow: "0 0 18px rgba(0,240,255,0.5)",
							animation: "glowPulse 3s ease-in-out infinite",
						}}>
						START VOTING
					</Link>
				) : (
					<Link
						href="/login"
						style={{
							display: "inline-block",
							marginTop: "0.5rem",
							padding: "0.55rem 1.5rem",
							fontSize: "0.85rem",
							fontWeight: 700,
							letterSpacing: "0.1em",
							color: "#00f0ff",
							border: "1px solid rgba(0,240,255,0.4)",
							borderRadius: "3px",
							textDecoration: "none",
						}}>
						SIGN IN TO VOTE
					</Link>
				)}
			</div>

			{/* Filter bar: Latest button + Flavor dropdown */}
			<div
				style={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					gap: "0.75rem",
					marginBottom: "1.75rem",
					flexWrap: "wrap",
				}}>
				{/* Latest button */}
				<button
					onClick={handleLatest}
					style={{
						padding: "0.4rem 1.1rem",
						fontSize: "0.76rem",
						fontWeight: viewMode === "latest" ? 700 : 400,
						letterSpacing: "0.1em",
						border: `1px solid ${viewMode === "latest" ? "rgba(0,240,255,0.65)" : "rgba(0,240,255,0.2)"}`,
						borderRadius: "3px",
						background: viewMode === "latest" ? "rgba(0, 240, 255, 0.1)" : "transparent",
						color: viewMode === "latest" ? "#00f0ff" : "#2e6070",
						cursor: viewMode === "latest" ? "default" : "pointer",
						fontFamily: "inherit",
						boxShadow: viewMode === "latest" ? "0 0 10px rgba(0,240,255,0.25)" : "none",
						transition: "all 0.15s",
					}}>
					✦ LATEST
				</button>

				{/* Flavor dropdown */}
				<div style={{ position: "relative" }}>
					<select
						value={viewMode === "flavor" && selectedFlavorId !== null ? selectedFlavorId : ""}
						onChange={handleFlavorChange}
						style={{
							appearance: "none",
							WebkitAppearance: "none",
							padding: "0.4rem 2.2rem 0.4rem 1rem",
							fontSize: "0.76rem",
							fontWeight: viewMode === "flavor" ? 700 : 400,
							letterSpacing: "0.1em",
							border: `1px solid ${viewMode === "flavor" ? "rgba(0,240,255,0.65)" : "rgba(0,240,255,0.2)"}`,
							borderRadius: "3px",
							background: viewMode === "flavor" ? "rgba(0, 240, 255, 0.1)" : "#000f1e",
							color: viewMode === "flavor" ? "#00f0ff" : "#2e6070",
							cursor: "pointer",
							fontFamily: "inherit",
							boxShadow: viewMode === "flavor" ? "0 0 10px rgba(0,240,255,0.25)" : "none",
							outline: "none",
							minWidth: "200px",
						}}>
						<option value="" disabled style={{ background: "#000f1e", color: "#2e6070" }}>
							BROWSE BY FLAVOR
						</option>
						{flavors.map((f) => (
							<option
								key={f.id}
								value={f.id}
								style={{ background: "#000f1e", color: "#c0ecff" }}>
								{f.slug.toUpperCase()}
							</option>
						))}
					</select>
					{/* Dropdown arrow */}
					<span
						style={{
							position: "absolute",
							right: "0.65rem",
							top: "50%",
							transform: "translateY(-50%)",
							color: viewMode === "flavor" ? "#00f0ff" : "#2e6070",
							fontSize: "0.6rem",
							pointerEvents: "none",
						}}>
						▼
					</span>
				</div>
			</div>

			{/* Active flavor label */}
			{viewMode === "flavor" && activeFlavor && (
				<p
					style={{
						textAlign: "center",
						margin: "-0.75rem 0 1rem",
						fontSize: "0.72rem",
						color: "#00f0ff",
						letterSpacing: "0.12em",
						textShadow: "0 0 6px rgba(0,240,255,0.4)",
					}}>
					FLAVOR: {activeFlavor.slug.toUpperCase()} · TOP VOTED
				</p>
			)}

			{/* Count line */}
			{!loading && !error && (
				<p
					style={{
						textAlign: "center",
						margin: "0 0 1.5rem",
						fontSize: "0.72rem",
						color: "#2e6070",
						letterSpacing: "0.08em",
					}}>
					{total} caption{total !== 1 ? "s" : ""} · page {page + 1} of {Math.max(1, totalPages)}
				</p>
			)}

			{loading && (
				<p style={{ color: "#2e6070", textAlign: "center", marginTop: "4rem", letterSpacing: "0.1em" }}>
					LOADING…
				</p>
			)}
			{error && (
				<p style={{ color: "#ff6600", textAlign: "center", letterSpacing: "0.06em" }}>
					ERROR: {error}
				</p>
			)}

			{/* Grid */}
			{!loading && !error && (
				<>
					{captions.length === 0 ? (
						<p style={{ color: "#2e6070", textAlign: "center", marginTop: "4rem", letterSpacing: "0.1em" }}>
							NO CAPTIONS HERE YET.
						</p>
					) : (
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
								gap: "1.25rem",
							}}>
							{captions.map((caption, i) => {
								const counts = voteCounts[caption.id] ?? { up: 0, down: 0 };
								return (
									<div
										key={caption.id}
										style={{
											background: "#000f1e",
											borderRadius: "6px",
											border: "1px solid rgba(0, 240, 255, 0.2)",
											overflow: "hidden",
											display: "flex",
											flexDirection: "column",
											animation: `fadeSlideUp 0.4s ease forwards, glowPulse 5s ease-in-out ${(i % 5) * 0.6}s infinite`,
											boxShadow: "0 0 15px rgba(0,240,255,0.05)",
										}}>
										<div style={{ height: "200px", overflow: "hidden", flexShrink: 0 }}>
											<img
												src={caption.images.url}
												alt={caption.images.image_description || "Meme"}
												style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
											/>
										</div>

										<div
											style={{
												padding: "0.875rem",
												display: "flex",
												flexDirection: "column",
												gap: "0.6rem",
												flex: 1,
												borderTop: "1px solid rgba(0,240,255,0.1)",
											}}>
											<p
												style={{
													margin: 0,
													fontSize: "0.85rem",
													lineHeight: 1.6,
													color: "#c0ecff",
													flex: 1,
													letterSpacing: "0.02em",
												}}>
												{caption.content}
											</p>

											<p style={{ margin: 0, fontSize: "0.7rem", color: "#2e6070", letterSpacing: "0.04em" }}>
												{formatDate(caption.created_datetime_utc)}
											</p>

											<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
												<span
													style={{
														fontSize: "0.78rem",
														fontWeight: 700,
														color: "#00f0ff",
														letterSpacing: "0.04em",
														textShadow: "0 0 6px rgba(0,240,255,0.5)",
													}}>
													+{counts.up}
												</span>
												<span style={{ fontSize: "0.7rem", color: "rgba(0,240,255,0.2)" }}>/</span>
												<span
													style={{
														fontSize: "0.78rem",
														fontWeight: 700,
														color: "#ff6600",
														letterSpacing: "0.04em",
														textShadow: "0 0 6px rgba(255,102,0,0.4)",
													}}>
													−{counts.down}
												</span>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}

					<PaginationBar page={page} totalPages={totalPages} onPage={handlePage} />
				</>
			)}
		</main>
	);
}
