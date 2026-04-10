"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const guestNavLinks = [
	{ href: "/gallery", label: "GALLERY" },
];

const authNavLinks = [
	{ href: "/gallery", label: "GALLERY" },
	{ href: "/vote",    label: "VOTE"    },
	{ href: "/upload",  label: "UPLOAD"  },
];

export default function Navbar() {
	const pathname = usePathname();
	const router   = useRouter();
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
				background: "rgba(0, 8, 16, 0.96)",
				borderBottom: "1px solid rgba(0, 240, 255, 0.25)",
				padding: "0 1.5rem",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				height: "56px",
				fontFamily: "inherit",
				position: "sticky",
				top: 0,
				zIndex: 100,
				boxShadow: "0 0 20px rgba(0,240,255,0.08), 0 1px 0 rgba(0,240,255,0.15)",
				animation: "glowPulse 5s ease-in-out infinite",
			}}>
			<div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
				{/* Logo */}
				<Link
					href="/"
					style={{
						fontSize: "1.1rem",
						fontWeight: 700,
						color: "#00f0ff",
						textDecoration: "none",
						letterSpacing: "0.14em",
						animation: "neonFlicker 9s ease-in-out infinite, textGlowPulse 4s ease-in-out infinite",
					}}>
					MEMEVOTE
				</Link>

				{/* Nav links */}
				<div style={{ display: "flex", gap: "0.1rem" }}>
					{(user ? authNavLinks : guestNavLinks).map((link) => {
						const isActive = pathname === link.href;
						return (
							<Link
								key={link.href}
								href={link.href}
								style={{
									padding: "0.5rem 1rem",
									fontSize: "0.78rem",
									letterSpacing: "0.1em",
									color: isActive ? "#00f0ff" : "#2e6070",
									textDecoration: "none",
									borderBottom: `2px solid ${isActive ? "#00f0ff" : "transparent"}`,
									boxShadow: isActive ? "0 2px 12px rgba(0,240,255,0.4)" : "none",
									textShadow: isActive ? "0 0 8px rgba(0,240,255,0.7)" : "none",
									transition: "color 0.2s, border-color 0.2s",
								}}>
								{link.label}
							</Link>
						);
					})}
				</div>
			</div>

			{/* Right side */}
			<div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
				{user ? (
					<>
						<span style={{ fontSize: "0.75rem", color: "#2e6070", letterSpacing: "0.04em" }}>
							{user.email}
						</span>
						<button
							onClick={handleSignOut}
							style={{
								padding: "0.4rem 1rem",
								fontSize: "0.78rem",
								letterSpacing: "0.08em",
								color: "#00f0ff",
								background: "transparent",
								border: "1px solid rgba(0, 240, 255, 0.3)",
								borderRadius: "3px",
								cursor: "pointer",
								fontFamily: "inherit",
								transition: "border-color 0.2s",
							}}>
							SIGN OUT
						</button>
					</>
				) : pathname !== "/login" ? (
					<Link
						href="/login"
						style={{
							padding: "0.5rem 1.3rem",
							fontSize: "0.9rem",
							fontWeight: 700,
							letterSpacing: "0.1em",
							color: "#000810",
							background: "#00f0ff",
							textDecoration: "none",
							borderRadius: "3px",
							boxShadow: "0 0 16px rgba(0,240,255,0.5), 0 0 45px rgba(0,240,255,0.2)",
							animation: "glowPulse 3s ease-in-out infinite",
						}}>
						SIGN IN
					</Link>
				) : null}
			</div>
		</nav>
	);
}
