import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { DataTable } from "primereact/datatable";
import type {
  DataTablePageEvent,
  DataTableSelectionMultipleChangeEvent,
} from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { OverlayPanel } from "primereact/overlaypanel";
import { InputNumber } from "primereact/inputnumber";
import { Checkbox } from "primereact/checkbox";
import type { CheckboxChangeEvent } from "primereact/checkbox";
import { Card } from "primereact/card";
import { ProgressSpinner } from "primereact/progressspinner";
import "primeflex/primeflex.css";
import type { Artwork } from "../types";

const API = "https://api.artic.edu/api/v1/artworks";

export const ArtworkTable: React.FC = () => {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [selectedIds, setselectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [first, setFirst] = useState<number>(0);
  const [rows, setRows] = useState<number>(12);

  const [numSelect, setnumSelect] = useState<number | null>(10);
  const op = useRef<OverlayPanel>(null);

  useEffect(() => {
    setLoading(true);
    const currentPage = first / rows + 1;
    const fields = [
      "id",
      "title",
      "place_of_origin",
      "artist_display",
      "inscriptions",
      "date_start",
      "date_end",
    ].join(",");
    const url = `${API}?page=${currentPage}&limit=${rows}&fields=${fields}`;

    axios
      .get(url)
      .then((response) => {
        setArtworks(response.data.data);
        setTotalRecords(response.data.pagination.total);
      })
      .catch((error) => {
        console.error("Failed to fetch", error);
        setArtworks([]);
        setTotalRecords(0);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [first, rows]);

  const onPageChange = (event: DataTablePageEvent) => {
    setFirst(event.first);
    setRows(event.rows);
  };

  const onSelectionChange = (
    e: DataTableSelectionMultipleChangeEvent<Artwork[]>
  ) => {
    const selectedArtworks: Artwork[] = e.value ?? [];
    const newSelectedIds = new Set(selectedIds);
    selectedArtworks.forEach((artwork: Artwork) =>
      newSelectedIds.add(artwork.id)
    );
    const currentPageIds = new Set(artworks.map((a: Artwork) => a.id));
    const selectedOnPageIds = new Set(
      selectedArtworks.map((a: Artwork) => a.id)
    );
    currentPageIds.forEach((id) => {
      if (selectedIds.has(id) && !selectedOnPageIds.has(id)) {
        newSelectedIds.delete(id);
      }
    });
    setselectedIds(newSelectedIds);
  };

  const handleRecords = async () => {
    if (numSelect === null || numSelect <= 0) return;
    setLoading(true);
    op.current?.hide();

    const newSelectedIds = new Set<number>();
    let recordsFetched = 0;
    let currentPage = 1;

    while (recordsFetched < numSelect) {
      try {
        const response = await axios.get(
          `${API}?page=${currentPage}&limit=100&fields=id`
        );
        const ids = response.data.data.map((item: { id: number }) => item.id);
        for (const id of ids) {
          if (recordsFetched < numSelect) {
            newSelectedIds.add(id);
            recordsFetched++;
          } else {
            break;
          }
        }
        if (!response.data.pagination.next_url) break;
        currentPage++;
      } catch (error) {
        console.error("Failed to fetch", error);
        break;
      }
    }
    setselectedIds(newSelectedIds);
    setLoading(false);
  };

  const isAllOnPageSelected =
    artworks.length > 0 && artworks.every((art) => selectedIds.has(art.id));

  const onSelectAllChange = (e: CheckboxChangeEvent) => {
    const checked = !!e.checked;
    const newSelectedIds = new Set(selectedIds);
    artworks.forEach((artwork: Artwork) => {
      if (checked) newSelectedIds.add(artwork.id);
      else newSelectedIds.delete(artwork.id);
    });
    setselectedIds(newSelectedIds);
  };

  const selectionHeader = (
    <div className="flex align-items-center">
      <Checkbox
        onChange={onSelectAllChange}
        checked={isAllOnPageSelected}
        disabled={artworks.length === 0}
      />
      <Button
        type="button"
        icon="pi pi-chevron-down"
        onClick={(e) => op.current?.toggle(e)}
        className="p-button-text p-button-secondary ml-1 p-0"
        style={{ width: "20px", height: "20px" }}
      />
    </div>
  );

  const currentPageSelection = artworks.filter((art) =>
    selectedIds.has(art.id)
  );

  const cardHeader = (
    <div className="table-header">
      <h2>Artworks</h2>
    </div>
  );

  const truncate = (value: string | null | undefined, max = 80) => {
    if (!value) return "-";
    return value.length > max ? `${value.slice(0, max)}…` : value;
  };

  return (
    <Card className="table-card" title={cardHeader}>
      <OverlayPanel ref={op}>
        <div className="flex flex-column gap-2 p-2">
          <h5>Select N Records</h5>
          <InputNumber
            value={numSelect ?? undefined}
            onValueChange={(e) => setnumSelect(e.value ?? null)}
            mode="decimal"
            showButtons
            min={1}
          />
          <Button label="Select" onClick={handleRecords} />
        </div>
      </OverlayPanel>

      <div className="datatable-wrapper">
        {loading && (
          <div className="loading-overlay">
            <ProgressSpinner />
          </div>
        )}

        <DataTable
          value={artworks}
          dataKey="id"
          selection={currentPageSelection}
          onSelectionChange={onSelectionChange}
          paginator
          lazy
          rows={rows}
          first={first}
          totalRecords={totalRecords}
          onPage={onPageChange}
          rowsPerPageOptions={[12, 24, 60]}
          selectionMode="multiple"
          showSelectAll={false}
        >
          <Column selectionMode="multiple" header={selectionHeader} />
          <Column
            field="title"
            header="Title"
            sortable
            style={{ width: "18%" }}
          />
          <Column
            field="place_of_origin"
            header="Place of Origin"
            sortable
            style={{ width: "15%" }}
            body={(row) => row.place_of_origin || "-"}
          />
          <Column
            field="artist_display"
            header="Artist"
            sortable
            style={{ width: "18%" }}
            body={(row) => truncate(row.artist_display)}
          />
          <Column
            field="inscriptions"
            header="Inscriptions"
            style={{ width: "24%" }}
            body={(row) => truncate(row.inscriptions)}
          />
          <Column
            field="date_start"
            header="Date Start"
            sortable
            style={{ width: "10%" }}
            body={(row) => row.date_start ?? "-"}
          />
          <Column
            field="date_end"
            header="Date End"
            sortable
            style={{ width: "10%" }}
            body={(row) => row.date_end ?? "-"}
          />
        </DataTable>
      </div>

      <div className="table-footer">
        <span>
          {selectedIds.size} of {totalRecords} row(s) selected.
        </span>
      </div>
    </Card>
  );
};
