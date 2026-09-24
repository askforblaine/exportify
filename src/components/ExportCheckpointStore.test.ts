import {
  createExportSessionKey,
  playlistExportId
} from "./ExportCheckpointStore"

describe("export checkpoint identity", () => {
  const playlists = [
    {
      id: "playlist-1",
      snapshot_id: "snapshot-a",
      tracks: { total: 10 }
    },
    {
      id: "playlist-2",
      snapshot_id: "snapshot-b",
      tracks: { total: 20 }
    }
  ]

  it("is stable for the same export inputs", () => {
    const config = { includeArtistsData: true }

    expect(createExportSessionKey(playlists, "", config))
      .toEqual(createExportSessionKey(playlists, "", config))
  })

  it("changes when playlist contents or export config change", () => {
    const base = createExportSessionKey(playlists, "", { includeArtistsData: false })
    const changedSnapshot = createExportSessionKey([
      { ...playlists[0], snapshot_id: "snapshot-new" },
      playlists[1]
    ], "", { includeArtistsData: false })
    const changedConfig = createExportSessionKey(playlists, "", { includeArtistsData: true })

    expect(changedSnapshot).not.toEqual(base)
    expect(changedConfig).not.toEqual(base)
  })

  it("has a deterministic fallback identity", () => {
    expect(playlistExportId({ uri: "spotify:playlist:test" }, 2))
      .toEqual("spotify:playlist:test")
    expect(playlistExportId({}, 2)).toEqual("playlist-2")
  })
})
