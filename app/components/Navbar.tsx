"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const navLinks = [
	{ href: "/vote", label: "Vote" },
	{ href: "/upload", label: "Upload" },
	{ href: "/about", label: "About" },
];

export default function Navbar() {
	const pathname = usePathname();
	const router = useRouter();
	const [user, setUser] = useState<User | null>(null);
	const supabase = createClient();

	useEffect(() => {
		supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
	}, [supabase]);

	async function handleSignOut() {
		await supabase.auth.signOut();
		setUser(null);
		router.push("/");
	}

	return (
		<nav
			style={{
				background: "#0f0f23",
				borderBottom: "1px solid #2a2a4a",
				padding: "0 1.5rem",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				height: "56px",
				fontFamily: "system-ui, sans-serif",
			}}>
			<div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
				<Link
					href="/"
					style={{
						fontSize: "1.15rem",
						fontWeight: 700,
						color: "#f0f0ff",
						textDecoration: "none",
						textShadow:
							"0 0 7px rgba(78,205,196,0.6), 0 0 30px rgba(78,205,196,0.3)",
					}}>
					MemeVote
				</Link>

				<div style={{ display: "flex", gap: "0.25rem" }}>
					{navLinks.map((link) => {
						const isActive = pathname === link.href;
						return (
							<Link
								key={link.href}
								href={link.href}
								style={{
									padding: "0.5rem 1rem",
									fontSize: "0.9rem",
									color: isActive ? "#4ecdc4" : "#8888aa",
									textDecoration: "none",
									borderBottom: isActive
										? "2px solid #4ecdc4"
										: "2px solid transparent",
									boxShadow: isActive
										? "0 2px 8px rgba(78,205,196,0.3)"
										: "none",
									transition: "color 0.2s, border-color 0.2s",
								}}>
								{link.label}
							</Link>
						);
					})}
				</div>
			</div>

			<div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
				{user ? (
					<>
						<span style={{ fontSize: "0.85rem", color: "#8888aa" }}>
							{user.email}
						</span>
						<button
							onClick={handleSignOut}
							style={{
								padding: "0.4rem 0.9rem",
								fontSize: "0.85rem",
								color: "#f0f0ff",
								background: "rgba(255,255,255,0.05)",
								border: "1px solid #3a3a5a",
								borderRadius: "6px",
								cursor: "pointer",
								transition: "background 0.2s",
							}}>
							Sign Out
						</button>
					</>
				) : (
					<Link
						href="/login"
						style={{
							padding: "0.4rem 0.9rem",
							fontSize: "0.85rem",
							color: "#4ecdc4",
							textDecoration: "none",
							border: "1px solid #4ecdc4",
							borderRadius: "6px",
							transition: "background 0.2s",
						}}>
						Sign In
					</Link>
				)}
			</div>
		</nav>
	);
}
