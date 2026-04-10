"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type Stage =
	| "idle"
	| "presigning"
	| "uploading"
	| "registering"
	| "captioning"
	| "success"
	| "error";

type CaptionRecord = {
	id: string;
	content: string;
	[key: string]: unknown;
};

const BASE_URL = "https://api.almostcrackd.ai";
const ACCEPTED_TYPES = [
	"image/jpeg",
	"image/jpg",
	"image/png",
	"image/webp",
	"image/gif",
	"image/heic",
];
const STAGE_LABELS: Partial<Record<Stage, string>> = {
	presigning:  "GETTING UPLOAD URL…",
	uploading:   "UPLOADING IMAGE…",
	registering: "REGISTERING IMAGE…",
	captioning:  "GENERATING CAPTIONS…",
};

export default function UploadPage() {
	const router   = useRouter();
	const supabase = createClient();
	const [user, setUser]           = useState<User | null>(null);
	const [authChecked, setAuthChecked] = useState(false);
	const [file, setFile]           = useState<File | null>(null);
	const [preview, setPreview]     = useState<string | null>(null);
	const [stage, setStage]         = useState<Stage>("idle");
	const [errorMsg, setErrorMsg]   = useState<string | null>(null);
	const [captions, setCaptions]   = useState<CaptionRecord[]>([]);
	const [cdnUrl, setCdnUrl]       = useState<string | null>(null);
	const previewUrlRef = useRef<string | null>(null);

	const isProcessing = ["presigning", "uploading", "registering", "captioning"].includes(stage);

	useEffect(() => {
		supabase.auth.getUser().then(({ data: { user } }) => {
			if (!user) { router.replace("/login"); return; }
			setUser(user);
			setAuthChecked(true);
		});
	}, [supabase, router]);

	useEffect(() => {
		return () => { if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current); };
	}, []);

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const selected = e.target.files?.[0] ?? null;
		if (previewUrlRef.current) { URL.revokeObjectURL(previewUrlRef.current); previewUrlRef.current = null; }
		setErrorMsg(null); setStage("idle"); setCaptions([]); setCdnUrl(null);

		if (!selected) { setFile(null); setPreview(null); return; }

		const isHeic    = selected.type === "image/heic" || selected.name.toLowerCase().endsWith(".heic");
		const validType = ACCEPTED_TYPES.includes(selected.type) || isHeic;

		if (!validType) {
			setFile(null); setPreview(null);
			setErrorMsg("Unsupported file type. Please upload a JPEG, PNG, WebP, GIF, or HEIC image.");
			setStage("error");
			return;
		}

		const url = URL.createObjectURL(selected);
		previewUrlRef.current = url;
		setFile(selected);
		setPreview(url);
	}

	async function handleUpload() {
		if (!file) return;

		try {
			const { data: sessionData } = await supabase.auth.getSession();
			const token = sessionData.session?.access_token;
			if (!token) { setErrorMsg("Session expired, please sign in again."); setStage("error"); return; }

			const authHeaders = {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			};

			// Step 1: Presign
			setStage("presigning");
			const presignRes = await fetch(`${BASE_URL}/pipeline/generate-presigned-url`, {
				method: "POST", headers: authHeaders,
				body: JSON.stringify({ contentType: file.type }),
			});
			if (!presignRes.ok) throw new Error(`Failed to get upload URL: ${await presignRes.text()}`);
			const { presignedUrl, cdnUrl: fetchedCdnUrl } = await presignRes.json();
			setCdnUrl(fetchedCdnUrl);

			// Step 2: Upload
			setStage("uploading");
			const uploadRes = await fetch(presignedUrl, {
				method: "PUT", headers: { "Content-Type": file.type }, body: file,
			});
			if (!uploadRes.ok) throw new Error(`Upload failed with status ${uploadRes.status}`);

			// Step 3: Register
			setStage("registering");
			const registerRes = await fetch(`${BASE_URL}/pipeline/upload-image-from-url`, {
				method: "POST", headers: authHeaders,
				body: JSON.stringify({ imageUrl: fetchedCdnUrl, isCommonUse: false }),
			});
			if (!registerRes.ok) throw new Error(`Failed to register image: ${await registerRes.text()}`);
			const { imageId } = await registerRes.json();

			// Step 4: Generate captions
			setStage("captioning");
			const captionRes = await fetch(`${BASE_URL}/pipeline/generate-captions`, {
				method: "POST", headers: authHeaders,
				body: JSON.stringify({ imageId, humorFlavorId: 377 }),
			});
			if (!captionRes.ok) throw new Error(`Failed to generate captions: ${await captionRes.text()}`);
			const result: CaptionRecord[] = await captionRes.json();

			setCaptions(result);
			setStage("success");
		} catch (err) {
			setErrorMsg(err instanceof Error ? err.message : String(err));
			setStage("error");
		}
	}

	function handleReset() {
		if (previewUrlRef.current) { URL.revokeObjectURL(previewUrlRef.current); previewUrlRef.current = null; }
		setFile(null); setPreview(null); setStage("idle");
		setErrorMsg(null); setCaptions([]); setCdnUrl(null);
	}

	if (!authChecked) {
		return (
			<main style={pageStyle}>
				<p style={{ color: "#2e6070", marginTop: "4rem", letterSpacing: "0.1em" }}>LOADING…</p>
			</main>
		);
	}

	if (!user) {
		return (
			<main style={pageStyle}>
				<p style={{ color: "#2e6070", marginTop: "4rem", letterSpacing: "0.08em" }}>
					Please sign in to upload images.
				</p>
			</main>
		);
	}

	return (
		<main style={pageStyle}>
			<style>{`
				@keyframes loadingSweep {
					0%   { transform: translateX(-100%); }
					100% { transform: translateX(550%); }
				}
			`}</style>

			{/* Hero */}
			<div style={heroStyle}>
				<h1
					style={{
						margin: "0 0 0.5rem",
						fontSize: "1.8rem",
						fontWeight: 800,
						color: "#00f0ff",
						letterSpacing: "0.18em",
						animation: "textGlowPulse 4s ease-in-out infinite",
					}}>
					GENERATE CAPTIONS
				</h1>
				<p
					style={{
						margin: 0,
						color: "#2e6070",
						fontSize: "0.82rem",
						maxWidth: "480px",
						lineHeight: 1.8,
						letterSpacing: "0.05em",
					}}>
					Upload an image and our AI will generate a set of witty captions for it.
				</p>

				{/* Step pills */}
				<div style={stepsRowStyle}>
					{[
						{ n: "1", label: "PICK AN IMAGE" },
						{ n: "2", label: "CLICK GENERATE" },
						{ n: "3", label: "GET CAPTIONS" },
					].map((s) => (
						<div key={s.n} style={stepPillStyle}>
							<span style={stepNumStyle}>{s.n}</span>
							<span style={{ color: "#2e6070", fontSize: "0.75rem", letterSpacing: "0.08em" }}>
								{s.label}
							</span>
						</div>
					))}
				</div>
			</div>

			{/* Card */}
			<div style={cardStyle}>
				{stage === "success" ? (
					<div>
						{/* Success header */}
						<div
							style={{
								textAlign: "center",
								marginBottom: "1.5rem",
								paddingBottom: "1.25rem",
								borderBottom: "1px solid rgba(0,240,255,0.12)",
							}}>
							<div
								style={{
									fontSize: "1.6rem",
									color: "#00f0ff",
									marginBottom: "0.3rem",
									textShadow: "0 0 12px rgba(0,240,255,0.7)",
									animation: "textGlowPulse 3s ease-in-out infinite",
								}}>
								✓
							</div>
							<h2
								style={{
									margin: 0,
									fontSize: "1rem",
									fontWeight: 700,
									color: "#00f0ff",
									letterSpacing: "0.14em",
								}}>
								UPLOAD COMPLETE
							</h2>
							<p style={{ margin: "0.3rem 0 0", fontSize: "0.75rem", color: "#2e6070", letterSpacing: "0.05em" }}>
								Image uploaded and captions generated.
							</p>
						</div>

						{/* Uploaded image */}
						{cdnUrl && (
							<div
								style={{
									marginBottom: "1.5rem",
									borderRadius: "6px",
									overflow: "hidden",
									border: "1px solid rgba(0,240,255,0.2)",
									boxShadow: "0 0 15px rgba(0,240,255,0.06)",
								}}>
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									src={cdnUrl}
									alt="Uploaded meme"
									style={{ width: "100%", maxHeight: "300px", objectFit: "contain", display: "block", background: "#000810" }}
								/>
							</div>
						)}

						{/* Captions */}
						<h2
							style={{
								fontSize: "0.78rem",
								fontWeight: 700,
								color: "#00f0ff",
								margin: "0 0 0.75rem",
								letterSpacing: "0.14em",
							}}>
							GENERATED CAPTIONS
						</h2>
						{captions.length === 0 ? (
							<p style={{ color: "#2e6070", letterSpacing: "0.06em", fontSize: "0.82rem" }}>
								No captions were generated.
							</p>
						) : (
							<ol style={{ margin: "0 0 1.5rem", padding: "0 0 0 1.25rem" }}>
								{captions.map((c, i) => (
									<li
										key={c.id ?? i}
										style={{
											color: "#c0ecff",
											marginBottom: "0.75rem",
											lineHeight: 1.65,
											fontSize: "0.9rem",
											paddingLeft: "0.25rem",
											letterSpacing: "0.02em",
										}}>
										{c.content}
									</li>
								))}
							</ol>
						)}

						<button onClick={handleReset} style={primaryButtonStyle}>
							UPLOAD ANOTHER
						</button>
					</div>
				) : (
					<>
						<h2
							style={{
								margin: "0 0 1.25rem",
								fontSize: "0.88rem",
								fontWeight: 700,
								color: "#00f0ff",
								letterSpacing: "0.12em",
							}}>
							UPLOAD AN IMAGE
						</h2>

						{/* Drop zone */}
						<label style={dropZoneStyle}>
							<div style={{ pointerEvents: "none", textAlign: "center" }}>
								<div style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>🖼️</div>
								<span style={{ color: "#c0ecff", fontSize: "0.85rem", fontWeight: 600, letterSpacing: "0.05em" }}>
									{file ? file.name : "CLICK TO SELECT A FILE"}
								</span>
								<span style={{ display: "block", color: "#2e6070", fontSize: "0.72rem", marginTop: "0.3rem", letterSpacing: "0.06em" }}>
									JPEG · PNG · WEBP · GIF · HEIC
								</span>
							</div>
							<input
								type="file"
								accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic,.heic"
								onChange={handleFileChange}
								disabled={isProcessing}
								style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
							/>
						</label>

						{/* Preview */}
						{preview && (
							<div
								style={{
									margin: "1rem 0",
									borderRadius: "6px",
									overflow: "hidden",
									border: "1px solid rgba(0,240,255,0.2)",
									boxShadow: "0 0 12px rgba(0,240,255,0.06)",
								}}>
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									src={preview}
									alt="Preview"
									style={{ width: "100%", maxHeight: "260px", objectFit: "contain", display: "block", background: "#000810" }}
								/>
							</div>
						)}

						{/* Error */}
						{stage === "error" && errorMsg && (
							<p
								style={{
									color: "#ff6600",
									fontSize: "0.82rem",
									margin: "0.75rem 0",
									padding: "0.6rem 0.85rem",
									background: "rgba(255,102,0,0.06)",
									borderRadius: "3px",
									border: "1px solid rgba(255,102,0,0.25)",
									letterSpacing: "0.04em",
								}}>
								{errorMsg}
							</p>
						)}

						{/* Progress */}
						{isProcessing && (
							<div style={{ margin: "1rem 0" }}>
								<div style={{ marginBottom: "0.5rem" }}>
									<span
										style={{
											color: "#00f0ff",
											fontSize: "0.78rem",
											fontWeight: 700,
											letterSpacing: "0.1em",
											textShadow: "0 0 6px rgba(0,240,255,0.5)",
										}}>
										{STAGE_LABELS[stage]}
									</span>
								</div>
								{/* Tron progress bar */}
								<div
									style={{
										width: "100%",
										height: "4px",
										background: "rgba(0,240,255,0.1)",
										borderRadius: "2px",
										overflow: "hidden",
										border: "1px solid rgba(0,240,255,0.15)",
									}}>
									<div
										style={{
											height: "100%",
											width: "35%",
											background: "linear-gradient(90deg, transparent, #00f0ff, rgba(0,240,255,0.5), #00f0ff, transparent)",
											borderRadius: "2px",
											animation: "loadingSweep 1.4s ease-in-out infinite",
											boxShadow: "0 0 8px rgba(0,240,255,0.6)",
										}}
									/>
								</div>
								{stage === "captioning" && (
									<p style={{ margin: "0.6rem 0 0", fontSize: "0.72rem", color: "#2e6070", lineHeight: 1.6, letterSpacing: "0.04em" }}>
										The AI is reading your image — this usually takes 15–30 seconds.
									</p>
								)}
							</div>
						)}

						{/* Submit */}
						<button
							onClick={handleUpload}
							disabled={!file || isProcessing}
							style={{
								...primaryButtonStyle,
								width: "100%",
								marginTop: "1rem",
								opacity: !file || isProcessing ? 0.35 : 1,
								cursor: !file || isProcessing ? "not-allowed" : "pointer",
							}}>
							{isProcessing ? STAGE_LABELS[stage] : "GENERATE CAPTIONS"}
						</button>
					</>
				)}
			</div>
		</main>
	);
}

const pageStyle: React.CSSProperties = {
	minHeight: "100vh",
	fontFamily: "inherit",
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	paddingTop: "2.5rem",
	paddingBottom: "4rem",
};

const heroStyle: React.CSSProperties = {
	width: "100%",
	maxWidth: "540px",
	textAlign: "center",
	marginBottom: "2rem",
	padding: "0 1rem",
};

const stepsRowStyle: React.CSSProperties = {
	display: "flex",
	justifyContent: "center",
	gap: "0.6rem",
	marginTop: "1.25rem",
	flexWrap: "wrap",
};

const stepPillStyle: React.CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: "0.5rem",
	background: "#000f1e",
	border: "1px solid rgba(0, 240, 255, 0.2)",
	borderRadius: "2px",
	padding: "0.3rem 0.85rem",
};

const stepNumStyle: React.CSSProperties = {
	width: "18px",
	height: "18px",
	borderRadius: "50%",
	background: "#00f0ff",
	color: "#000810",
	fontSize: "0.68rem",
	fontWeight: 700,
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	boxShadow: "0 0 6px rgba(0,240,255,0.5)",
};

const cardStyle: React.CSSProperties = {
	width: "100%",
	maxWidth: "500px",
	background: "#000f1e",
	borderRadius: "6px",
	border: "1px solid rgba(0, 240, 255, 0.25)",
	padding: "2rem",
	boxShadow: "0 0 40px rgba(0,240,255,0.07), inset 0 0 20px rgba(0,240,255,0.02)",
	animation: "glowPulse 5s ease-in-out infinite",
};

const dropZoneStyle: React.CSSProperties = {
	position: "relative",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	width: "100%",
	minHeight: "120px",
	border: "1px dashed rgba(0, 240, 255, 0.3)",
	borderRadius: "6px",
	background: "#000810",
	cursor: "pointer",
	boxSizing: "border-box",
	transition: "border-color 0.2s",
};

const primaryButtonStyle: React.CSSProperties = {
	padding: "0.7rem 1.5rem",
	fontSize: "0.85rem",
	fontWeight: 700,
	letterSpacing: "0.1em",
	color: "#000810",
	background: "#00f0ff",
	border: "none",
	borderRadius: "4px",
	cursor: "pointer",
	fontFamily: "inherit",
	boxShadow: "0 0 16px rgba(0,240,255,0.4)",
	animation: "glowPulse 3s ease-in-out infinite",
	transition: "opacity 0.2s",
};
