"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

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
	const [user, setUser] = useState<User | null>(null);
	const router = useRouter();
	const supabase = createClient();

	useEffect(() => {
		async function init() {
			const { data: { user } } = await supabase.auth.getUser();
			setUser(user);

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

	async function handleSignOut() {
		await supabase.auth.signOut();
		router.push("/login");
	}

	return (
		<main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "1.5rem",
				}}>
				<h1 style={{ margin: 0 }}>Screenshots with Public Images</h1>
				{user && (
					<div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
						<span style={{ fontSize: "0.9rem", color: "#555" }}>
							{user.email}
						</span>
						<button
							onClick={handleSignOut}
							style={{
								padding: "0.5rem 1rem",
								fontSize: "0.9rem",
								backgroundColor: "#e5e5e5",
								border: "none",
								borderRadius: "6px",
								cursor: "pointer",
							}}>
							Sign Out
						</button>
					</div>
				)}
			</div>

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
