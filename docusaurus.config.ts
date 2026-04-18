import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Al Khaliq Backend Docs',
  tagline: 'Reference for the Al Khaliq music streaming platform backend',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://igee-17.github.io',
  baseUrl: '/al-khaliq-docs/',

  organizationName: 'igee-17',
  projectName: 'al-khaliq-docs',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Al Khaliq Backend Docs',
      logo: {
        alt: 'Al Khaliq logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/igee-17/al-khaliq-backend',
          label: 'Backend repo',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Getting started', to: '/getting-started/local-setup' },
            { label: 'Architecture', to: '/architecture/module-layout' },
            { label: 'Catalog', to: '/catalog/data-model' },
            { label: 'AWS', to: '/aws/overview' },
          ],
        },
        {
          title: 'Repos',
          items: [
            {
              label: 'Backend',
              href: 'https://github.com/igee-17/al-khaliq-backend',
            },
            {
              label: 'Docs (this site)',
              href: 'https://github.com/igee-17/al-khaliq-docs',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Swagger (dev)',
              href: 'http://localhost:3000/docs',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Al Khaliq. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
