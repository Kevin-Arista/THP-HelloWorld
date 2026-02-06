"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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

export default function Home() {
	const [rows, setRows] = useState<Screenshot[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function fetchData() {
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

		fetchData();
	}, []);

	return (
		<main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
			<h1 style={{ marginBottom: "1.5rem" }}>Screenshots with Public Images</h1>

			{loading && <p>Loading...</p>}
			{error && <p style={{ color: "red" }}>Error: {error}</p>}

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
								background: "#fff",
								borderRadius: "12px",
								boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
								overflow: "hidden",
							}}>
							<img
								src={row.captions.images.url}
								alt={row.captions.images.image_description || "Screenshot"}
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
									}}>
									{row.captions.content}
								</p>
								<p
									style={{
										margin: "0.75rem 0 0",
										fontSize: "0.8rem",
										color: "#888",
									}}>
									{new Date(row.captions.created_datetime_utc).toLocaleString()}
								</p>
							</div>
						</div>
					))}
				</div>
			)}
		</main>
	);
}
