"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Screenshot = {
	id: number;
	created_datetime_utc: string;
	caption_id: string;
	profile_id: string;
	captions: {
		id: string;
		content: string;
		created_datetime_utc: string;
		image_id: string;
		images: {
			id: string;
			url: string;
			image_description: string | null;
		};
	};
};

export default function ShowcasePage() {
	const [rows, setRows] = useState<Screenshot[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const supabase = createClient();

	useEffect(() => {
		async function init() {
			const { data, error } = await supabase
				.from("screenshots")
				.select(
					`
					*,
					captions!inner (
						id,
						content,
						created_datetime_utc,
						image_id,
						images!inner (
							id,
							url,
							image_description
						)
					)
				`,
				)
				.eq("captions.images.is_public", true);

			if (error) {
				setError(error.message);
			} else {
				setRows(data || []);
			}
			setLoading(false);
		}

		init();
	}, [supabase]);

	return (
		<main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
			<h1
				style={{
					margin: "0 0 1.5rem",
					textAlign: "center",
					fontSize: "1.8rem",
					color: "#f0f0ff",
					textShadow:
						"0 0 7px rgba(78,205,196,0.6), 0 0 30px rgba(78,205,196,0.3)",
				}}>
				Meme Showcase
			</h1>

			{loading && <p style={{ color: "#8888aa", textAlign: "center" }}>Loading...</p>}
			{error && (
				<p style={{ color: "#ff6b6b", textAlign: "center" }}>
					Error: {error}
				</p>
			)}

			{!loading && !error && (
				<div
					style={{
						display: "grid",
						gap: "1.5rem",
						maxWidth: "500px",
						margin: "0 auto",
					}}>
					{rows.map((row) => (
						<div
							key={row.id}
							style={{
								background: "#16213e",
								borderRadius: "12px",
								boxShadow:
									"0 4px 20px rgba(0,0,0,0.3), 0 0 15px rgba(78,205,196,0.05)",
								overflow: "hidden",
							}}>
							<img
								src={row.captions.images.url}
								alt={
									row.captions.images.image_description ||
									"Screenshot"
								}
								style={{
									width: "100%",
									display: "block",
								}}
							/>
							<div style={{ padding: "1rem" }}>
								<p
									style={{
										margin: 0,
										fontSize: "1rem",
										lineHeight: 1.4,
										color: "#f0f0ff",
									}}>
									{row.captions.content}
								</p>
								<p
									style={{
										margin: "0.75rem 0 0",
										fontSize: "0.8rem",
										color: "#8888aa",
									}}>
									{new Date(
										row.captions.created_datetime_utc,
									).toLocaleString()}
								</p>
							</div>
						</div>
					))}
				</div>
			)}
		</main>
	);
}
