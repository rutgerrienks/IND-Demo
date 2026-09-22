import assert from "node:assert/strict";
import test from "node:test";
import { buildFindingRegionsFromBboxHtml } from "../lib/preview-regions.js";

test("previewregio koppelt gemarkeerde tekst aan finding en PDF-coordinaten", () => {
  const html = `
    <page width="600" height="800">
      <word xMin="60" yMin="80" xMax="100" yMax="100">Deze</word>
      <word xMin="105" yMin="80" xMax="170" yMax="100">keuzes</word>
      <word xMin="175" yMin="80" xMax="220" yMax="100">leiden</word>
      <word xMin="225" yMin="80" xMax="250" yMax="100">tot</word>
      <word xMin="255" yMin="80" xMax="290" yMax="100">vier</word>
      <word xMin="60" yMin="110" xMax="130" yMax="130">scenario&apos;s.</word>
    </page>`;
  const regions = buildFindingRegionsFromBboxHtml(html, [{
    id: "finding-1",
    matchTexts: ["Deze keuzes leiden tot vier scenario's."],
  }]);

  assert.equal(regions["finding-1"].length, 2);
  assert.deepEqual(regions["finding-1"][0], {
    page: 0,
    x: 10,
    y: 10,
    width: 38.333333333333336,
    height: 2.5,
  });
  assert.equal(regions["finding-1"][1].page, 0);
});

test("previewregio vindt een stabiel tekstdeel als PDF-interpunctie afwijkt", () => {
  const html = `
    <page width="600" height="800">
      <word xMin="60" yMin="80" xMax="100" yMax="100">Vaste</word>
      <word xMin="105" yMin="80" xMax="170" yMax="100">bezetting</word>
      <word xMin="175" yMin="80" xMax="220" yMax="100">is</word>
      <word xMin="225" yMin="80" xMax="300" yMax="100">berekend</word>
      <word xMin="305" yMin="80" xMax="330" yMax="100">op</word>
      <word xMin="335" yMin="80" xMax="420" yMax="100">maximum</word>
      <word xMin="425" yMin="80" xMax="510" yMax="100">werkvoorraad.</word>
    </page>`;
  const regions = buildFindingRegionsFromBboxHtml(html, [{
    id: "finding-2",
    matchTexts: ["Daarnaast blijft bij pieken capaciteit nodig; de vaste bezetting is berekend op ‘maximum werkvoorraad’ en extra capaciteit blijft nodig."],
  }]);

  assert.equal(regions["finding-2"].length, 1);
  assert.equal(regions["finding-2"][0].page, 0);
});
