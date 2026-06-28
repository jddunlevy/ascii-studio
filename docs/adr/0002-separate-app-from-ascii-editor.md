# Separate app, not a monorepo with ascii-editor

ascii-studio is a standalone Next.js app that copies the relevant parts of ascii-editor rather than sharing a codebase. The ascii-editor element model needs to be extended with `bindings` and frame sequences, the store structure is fundamentally different (playback state, global bindings, audio track), and the two tools have different persistence backends (ascii-editor uses Supabase; ascii-studio uses localStorage). A monorepo would add tooling overhead while making it harder to diverge the data model as audio-specific requirements emerge.
