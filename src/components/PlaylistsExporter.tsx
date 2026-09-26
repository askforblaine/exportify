import React from "react"
import { withTranslation, WithTranslation } from "react-i18next"
import { Button } from "react-bootstrap"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { saveAs } from "file-saver"
import JSZip from "jszip"

import PlaylistExporter from "./PlaylistExporter"
import {
  createExportSessionKey,
  ExportCheckpointStore,
  playlistExportId
} from "./ExportCheckpointStore"
import { apiCallErrorHandler, isAbortError } from "helpers"
import PlaylistsData from "./data/PlaylistsData"

interface PlaylistsExporterProps extends WithTranslation {
  accessToken: string
  playlistsData: PlaylistsData
  searchQuery: string
  config: any
  onPlaylistExportStarted: (playlistName: string, doneCount: number) => void
  onPlaylistsExportDone: () => void
}

interface PlaylistsExporterState {
  exporting: boolean
  stopping: boolean
}

// Handles exporting all playlist data as a zip file
class PlaylistsExporter extends React.Component<PlaylistsExporterProps, PlaylistsExporterState> {
  state: PlaylistsExporterState = {
    exporting: false,
    stopping: false
  }

  private abortController?: AbortController
  private checkpointStore = new ExportCheckpointStore()

  private throwIfAborted(signal: AbortSignal) {
    if (signal.aborted) {
      throw new DOMException("Export interrupted", "AbortError")
    }
  }

  private uniqueFileName(exporter: PlaylistExporter, usedNames: Set<string>): string {
    let fileName = exporter.fileName(false)

    for (let i = 1; usedNames.has(fileName + exporter.fileExtension()); i++) {
      fileName = exporter.fileName(false) + ` (${i})`
    }

    return fileName + exporter.fileExtension()
  }

  async export(
    accessToken: string,
    playlistsData: PlaylistsData,
    searchQuery: string,
    config: any,
    signal: AbortSignal
  ) {
    const playlists = searchQuery === ""
      ? await playlistsData.all(signal)
      : await playlistsData.search(searchQuery, signal)

    this.throwIfAborted(signal)

    const key = createExportSessionKey(playlists, searchQuery, config)
    const playlistIds = playlists.map((playlist, index) => playlistExportId(playlist, index))
    let checkpoint = await this.checkpointStore.load(key)

    if (!checkpoint || checkpoint.playlistIds.join("\n") !== playlistIds.join("\n")) {
      checkpoint = {
        version: 1,
        key,
        playlistIds,
        completed: [],
        updatedAt: Date.now()
      }
      await this.checkpointStore.save(checkpoint)
    }

    const completedByIndex = new Map(checkpoint.completed.map(item => [item.index, item]))
    const usedNames = new Set(checkpoint.completed.map(item => item.fileName))
    let doneCount = checkpoint.completed.length

    for (let index = 0; index < playlists.length; index++) {
      this.throwIfAborted(signal)

      if (completedByIndex.has(index)) {
        continue
      }

      const playlist = playlists[index]
      this.props.onPlaylistExportStarted(playlist.name, doneCount)

      const exporter = new PlaylistExporter(accessToken, playlist, config, signal)
      const csvData = await exporter.csvData()
      this.throwIfAborted(signal)

      const fileName = this.uniqueFileName(exporter, usedNames)
      usedNames.add(fileName)

      checkpoint.completed.push({
        playlistId: playlistExportId(playlist, index),
        index,
        fileName,
        csvData
      })
      checkpoint.updatedAt = Date.now()
      await this.checkpointStore.save(checkpoint)
      doneCount++
    }

    this.throwIfAborted(signal)

    const zip = new JSZip()
    checkpoint.completed
      .sort((a, b) => a.index - b.index)
      .forEach(item => zip.file(item.fileName, item.csvData))

    const content = await zip.generateAsync({ type: "blob" })
    this.throwIfAborted(signal)

    saveAs(content, "spotify_playlists.zip")
    await this.checkpointStore.remove(key)
    this.props.onPlaylistsExportDone()
  }

  exportPlaylists = () => {
    if (this.state.exporting) {
      this.setState({ stopping: true })
      this.abortController?.abort()
      return
    }

    this.abortController = new AbortController()
    const signal = this.abortController.signal

    this.setState(
      { exporting: true, stopping: false },
      () => {
        this.export(
          this.props.accessToken,
          this.props.playlistsData,
          this.props.searchQuery,
          this.props.config,
          signal
        ).catch((error) => {
          if (!isAbortError(error)) {
            apiCallErrorHandler(error)
          }
        }).finally(() => {
          this.abortController = undefined
          this.setState({ exporting: false, stopping: false })
        })
      }
    )
  }

  componentWillUnmount() {
    this.abortController?.abort()
  }

  render() {
    const exportText = this.props.searchQuery === ""
      ? this.props.i18n.t("export_all")
      : this.props.i18n.t("export_search_results")

    const text = this.state.exporting
      ? (this.state.stopping ? "Stopping…" : "Stop export")
      : exportText

    return (
      <Button
        type="submit"
        variant={this.state.exporting ? "outline-danger" : "outline-secondary"}
        size="xs"
        onClick={this.exportPlaylists}
        className="text-nowrap"
        disabled={this.state.stopping}
        aria-label={this.state.exporting ? "Stop export" : undefined}
      >
        <FontAwesomeIcon icon={this.state.exporting ? ['far', 'times-circle'] : ['far', 'file-archive']} /> {text}
      </Button>
    )
  }
}

export default withTranslation()(PlaylistsExporter)
