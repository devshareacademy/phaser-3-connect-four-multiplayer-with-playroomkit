/**
 * A custom Phaser 3 File Loader that is used for loading custom fonts into the game.
 * This File Loader uses the `webfontloader` library for loading the Google fonts.
 */

import * as Phaser from 'phaser';
import WebFontLoader from 'webfontloader';

export class WebFontFileLoader extends Phaser.Loader.File {
  #fontNames: string[];

  /**
   * @param {Phaser.Loader.LoaderPlugin} loader The Loader that is going to load this File.
   * @param {string[]} fontNames The list of font names that will be loaded by the WebFontLoader library.
   *                             The font names need to match the font-family name in the @font-face style declaration.
   */
  constructor(loader: Phaser.Loader.LoaderPlugin, fontNames: string[]) {
    super(loader, {
      type: 'webfont',
      key: fontNames.toString(),
    });

    this.#fontNames = fontNames;
  }

  /**
   * Loads the provided fonts from Google.
   */
  load(): void {
    WebFontLoader.load({
      google: {
        families: this.#fontNames,
      },
      active: () => {
        this.loader.nextFile(this, true);
      },
      inactive: () => {
        console.error(`Failed to load custom fonts ${JSON.stringify(this.#fontNames)}`);
        this.loader.nextFile(this, false);
      },
    });
  }
}
