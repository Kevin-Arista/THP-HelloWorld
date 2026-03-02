"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const PAGE_SIZE = 12;

type SortKey = "top" | "new" | "low";

const SORTS: {
	key: SortKey;
	label: string;
	column: string;
	ascending: boolean;
}[] = [
	{ key: "top", label: "▲ Top Voted", column: "like_count", ascending: false },
	{
		key: "new",
		label: "✦ Latest",
		column: "created_datetime_utc",
		ascending: false,
	},
	{ key: "low", label: "▼ Lowest", column: "like_count", ascending: true },
];

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
	const left = page - delta;
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
		height: "36px",
		borderRadius: "6px",
		border: "1px solid #3a3a5a",
		background: "rgba(255,255,255,0.04)",
		color: "#8888aa",
		cursor: "pointer",
		fontSize: "0.85rem",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		fontFamily: "system-ui, sans-serif",
	};

	return (
		<div
			style={{
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
				gap: "0.4rem",
				marginTop: "2.5rem",
				flexWrap: "wrap",
			}}>
			<button
				onClick={() => onPage(page - 1)}
				disabled={page === 0}
				style={{
					...btnBase,
					padding: "0 0.85rem",
					color: page === 0 ? "#3a3a5a" : "#8888aa",
					cursor: page === 0 ? "default" : "pointer",
				}}>
				← Prev
			</button>

			{pages.map((p, idx) =>
				p === "…" ? (
					<span
						key={`ellipsis-${idx}`}
						style={{
							color: "#3a3a5a",
							padding: "0 0.25rem",
							lineHeight: "36px",
						}}>
						…
					</span>
				) : (
					<button
						key={p}
						onClick={() => onPage(p)}
						style={{
							...btnBase,
							width: "36px",
							border: `1px solid ${p === page ? "#4ecdc4" : "#3a3a5a"}`,
							background:
								p === page ? "rgba(78,205,196,0.15)" : "rgba(255,255,255,0.04)",
							color: p === page ? "#4ecdc4" : "#8888aa",
							cursor: p === page ? "default" : "pointer",
							fontWeight: p === page ? 700 : 400,
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
					color: page === totalPages - 1 ? "#3a3a5a" : "#8888aa",
					cursor: page === totalPages - 1 ? "default" : "pointer",
				}}>
				Next →
			</button>
		</div>
	);
}

export default function Home() {
	const [captions, setCaptions] = useState<Caption[]>([]);
	const [voteCounts, setVoteCounts] = useState<VoteCounts>({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(0);
	const [total, setTotal] = useState(0);
	const [sort, setSort] = useState<SortKey>("top");
	const [user, setUser] = useState<User | null>(null);
	const supabase = createClient();

	const totalPages = Math.ceil(total / PAGE_SIZE);

	useEffect(() => {
		const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
			setUser(session?.user ?? null);
		});
		return () => subscription.unsubscribe();
	}, [supabase]);

	const fetchCaptions = useCallback(
		async (pageIndex: number, sortKey: SortKey) => {
			setLoading(true);
			setError(null);
			const from = pageIndex * PAGE_SIZE;
			const to = from + PAGE_SIZE - 1;

			if (sortKey === "top" || sortKey === "low") {
				const { data: allVotes, error: votesErr } = await supabase
					.from("caption_votes")
					.select("caption_id, vote_value");

				if (votesErr) {
					setError(votesErr.message);
					setLoading(false);
					return;
				}

				const upMap: Record<string, number> = {};
				const downMap: Record<string, number> = {};
				(allVotes || []).forEach((v) => {
					if (v.vote_value > 0) {
						upMap[v.caption_id] = (upMap[v.caption_id] || 0) + 1;
					} else {
						downMap[v.caption_id] = (downMap[v.caption_id] || 0) + 1;
					}
				});

				// "top" → most upvotes first; "low" → most downvotes first
				const rankSource = sortKey === "top" ? upMap : downMap;
				const rankedIds = Object.entries(rankSource)
					.sort((a, b) => b[1] - a[1])
					.map(([id]) => id);

				if (rankedIds.length === 0) {
					setCaptions([]);
					setTotal(0);
					setVoteCounts({});
					setLoading(false);
					return;
				}

				const pageIds = rankedIds.slice(from, to + 1);
				const { data, error } = await supabase
					.from("captions")
					.select(
						`id, content, created_datetime_utc, like_count, image_id,
						images!inner (id, url, image_description)`,
					)
					.in("id", pageIds)

					.not("content", "is", null);

				if (error) {
					setError(error.message);
					setLoading(false);
					return;
				}

				const captionMap: Record<string, Caption> = {};
				((data as unknown as Caption[]) || []).forEach(
					(c) => (captionMap[c.id] = c),
				);
				const captionRows = pageIds
					.map((id) => captionMap[id])
					.filter(Boolean) as Caption[];

				setCaptions(captionRows);
				setTotal(rankedIds.length);

				const counts: VoteCounts = {};
				captionRows.forEach((c) => {
					counts[c.id] = { up: upMap[c.id] ?? 0, down: downMap[c.id] ?? 0 };
				});
				setVoteCounts(counts);
				setLoading(false);
				return;
			}

			// ── Top / Latest: standard server-side sort ────────────────────
			const sortConfig = SORTS.find((s) => s.key === sortKey)!;
			const { data, error, count } = await supabase
				.from("captions")
				.select(
					`id, content, created_datetime_utc, like_count, image_id,
					images!inner (id, url, image_description)`,
					{ count: "exact" },
				)
				.not("content", "is", null)
				.order(sortConfig.column, { ascending: sortConfig.ascending })
				.range(from, to);



			if (error) {
				setError(error.message);
				setLoading(false);
				return;
			}

			const captionRows = (data as unknown as Caption[]) || [];
			setCaptions(captionRows);
			setTotal(sortKey === "new" ? Math.min(count ?? 0, PAGE_SIZE * 10) : (count ?? 0));

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
		},
		[supabase],
	);

	useEffect(() => {
		fetchCaptions(page, sort);
	}, [page, sort, fetchCaptions]);



	function handleSort(s: SortKey) {
		setSort(s);
		setPage(0);
	}

	function handlePage(p: number) {
		setPage(p);
		window.scrollTo({ top: 0, behavior: "smooth" });
	}

	return (
		<main
			style={{
				padding: "2rem",
				fontFamily: "system-ui, sans-serif",
				maxWidth: "1400px",
				margin: "0 auto",
			}}>
			{/* Header */}
			<div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
				<h1
					style={{
						margin: "0 0 0.4rem",
						fontSize: "1.8rem",
						color: "#f0f0ff",
						textShadow:
							"0 0 7px rgba(78,205,196,0.6), 0 0 30px rgba(78,205,196,0.3)",
					}}>
					Gallery
				</h1>
				{user ? (
					<Link
						href="/vote"
						style={{
							display: "inline-block",
							marginTop: "0.5rem",
							padding: "0.6rem 1.5rem",
							fontSize: "1rem",
							fontWeight: 600,
							color: "#1a1a2e",
							background: "#4ecdc4",
							borderRadius: "8px",
							textDecoration: "none",
							boxShadow: "0 0 15px rgba(78,205,196,0.4)",
						}}>
						Go Vote
					</Link>
				) : (
					<Link
						href="/login"
						style={{
							display: "inline-block",
							marginTop: "0.5rem",
							padding: "0.6rem 1.5rem",
							fontSize: "1rem",
							fontWeight: 600,
							color: "#4ecdc4",
							border: "1px solid #4ecdc4",
							borderRadius: "8px",
							textDecoration: "none",
						}}>
						Sign In to Vote
					</Link>
				)}
			</div>

			{/* Filter bar */}
			<div
				style={{
					display: "flex",
					justifyContent: "center",
					gap: "0.5rem",
					marginBottom: "1.75rem",
					flexWrap: "wrap",
				}}>
				{SORTS.map((s) => {
					const active = sort === s.key;
					return (
						<button
							key={s.key}
							onClick={() => handleSort(s.key)}
							style={{
								padding: "0.4rem 1rem",
								fontSize: "0.82rem",
								fontWeight: active ? 600 : 400,
								border: `1px solid ${active ? "#4ecdc4" : "#3a3a5a"}`,
								borderRadius: "999px",
								background: active
									? "rgba(78,205,196,0.15)"
									: "rgba(255,255,255,0.03)",
								color: active ? "#4ecdc4" : "#8888aa",
								cursor: active ? "default" : "pointer",
								transition: "all 0.15s",
								fontFamily: "system-ui, sans-serif",
							}}>
							{s.label}
						</button>
					);
				})}
			</div>

			{/* Count line */}
			{!loading && !error && (
				<p
					style={{
						textAlign: "center",
						margin: "-0.75rem 0 1.5rem",
						fontSize: "0.78rem",
						color: "#5a5a7a",
					}}>
					{total} caption{total !== 1 ? "s" : ""} &middot; page {page + 1} of{" "}
					{Math.max(1, totalPages)}
				</p>
			)}

			{loading && (
				<p style={{ color: "#8888aa", textAlign: "center", marginTop: "4rem" }}>
					Loading…
				</p>
			)}
			{error && (
				<p style={{ color: "#ff6b6b", textAlign: "center" }}>Error: {error}</p>
			)}

			{/* Gallery grid */}
			{!loading && !error && (
				<>
					{captions.length === 0 ? (
						<p
							style={{
								color: "#8888aa",
								textAlign: "center",
								marginTop: "4rem",
							}}>
							No captions here yet.
						</p>
					) : (
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
								gap: "1.25rem",
							}}>
							{captions.map((caption) => {
								const counts = voteCounts[caption.id] ?? { up: 0, down: 0 };
		
								return (
									<div
										key={caption.id}
										style={{
											background: "#16213e",
											borderRadius: "12px",
											boxShadow:
												"0 4px 20px rgba(0,0,0,0.3), 0 0 15px rgba(78,205,196,0.05)",
											overflow: "hidden",
											display: "flex",
											flexDirection: "column",
										}}>
										{/* Fixed-height image */}
										<div
											style={{
												height: "200px",
												overflow: "hidden",
												flexShrink: 0,
											}}>
											<img
												src={caption.images.url}
												alt={caption.images.image_description || "Meme"}
												style={{
													width: "100%",
													height: "100%",
													objectFit: "cover",
													display: "block",
												}}
											/>
										</div>

										{/* Card body */}
										<div
											style={{
												padding: "0.875rem",
												display: "flex",
												flexDirection: "column",
												gap: "0.6rem",
												flex: 1,
											}}>
											{/* Caption text */}
											<p
												style={{
													margin: 0,
													fontSize: "0.88rem",
													lineHeight: 1.5,
													color: "#e0e0f0",
													flex: 1,
												}}>
												{caption.content}
											</p>

											{/* Date */}
											<p
												style={{
													margin: 0,
													fontSize: "0.75rem",
													color: "#5a5a7a",
												}}>
												{formatDate(caption.created_datetime_utc)}
											</p>

											{/* Vote counts + buttons */}
											<div
												style={{
													display: "flex",
													alignItems: "center",
													justifyContent: "space-between",
												}}>
												{/* Up / down / net score */}
												<div
													style={{
														display: "flex",
														gap: "0.4rem",
														alignItems: "center",
													}}>
													<span
														style={{
															fontSize: "0.8rem",
															fontWeight: 600,
															color: "#4ecdc4",
														}}>
														+{counts.up}
													</span>
													<span
														style={{ fontSize: "0.75rem", color: "#3a3a5a" }}>
														/
													</span>
													<span
														style={{
															fontSize: "0.8rem",
															fontWeight: 600,
															color: "#ff6b6b",
														}}>
														-{counts.down}
													</span>
													
												</div>

						
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}

					<PaginationBar
						page={page}
						totalPages={totalPages}
						onPage={handlePage}
					/>
				</>
			)}
		</main>
	);
}
