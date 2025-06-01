import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Multi-Tenant Architecture',
    Svg: () => (
      <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
        <rect x="20" y="40" width="40" height="40" fill="#2e8555" rx="4"/>
        <rect x="80" y="40" width="40" height="40" fill="#2e8555" rx="4"/>
        <rect x="140" y="40" width="40" height="40" fill="#2e8555" rx="4"/>
        <rect x="50" y="120" width="100" height="40" fill="#1c4532" rx="4"/>
        <text x="100" y="145" textAnchor="middle" fill="white" fontSize="12">Dgraph</text>
      </svg>
    ),
    description: (
      <>
        Enterprise-grade multi-tenant support with complete data isolation.
        Each tenant operates in a dedicated namespace with shared infrastructure efficiency.
      </>
    ),
  },
  {
    title: 'Living Knowledge Graph',
    Svg: () => (
      <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
        <circle cx="100" cy="60" r="20" fill="#2e8555"/>
        <circle cx="60" cy="140" r="15" fill="#25c2a0"/>
        <circle cx="140" cy="140" r="15" fill="#25c2a0"/>
        <line x1="85" y1="75" x2="70" y2="125" stroke="#2e8555" strokeWidth="2"/>
        <line x1="115" y1="75" x2="130" y2="125" stroke="#2e8555" strokeWidth="2"/>
        <line x1="75" y1="140" x2="125" y2="140" stroke="#25c2a0" strokeWidth="2"/>
      </svg>
    ),
    description: (
      <>
        Interactive platform for exploring and curating structured knowledge.
        Hybrid hierarchical and non-hierarchical graph structure powered by Dgraph.
      </>
    ),
  },
  {
    title: 'Modern Tech Stack',
    Svg: () => (
      <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
        <rect x="40" y="60" width="120" height="80" fill="#2e8555" rx="8"/>
        <rect x="50" y="70" width="100" height="15" fill="#25c2a0" rx="2"/>
        <rect x="50" y="90" width="100" height="15" fill="#25c2a0" rx="2"/>
        <rect x="50" y="110" width="100" height="15" fill="#25c2a0" rx="2"/>
        <text x="100" y="160" textAnchor="middle" fill="#2e8555" fontSize="12">React + TypeScript + Vite</text>
      </svg>
    ),
    description: (
      <>
        Built with React, TypeScript, and Vite for fast development.
        Comprehensive testing with Jest, Vitest, and Playwright for reliability.
      </>
    ),
  },
];

function Feature({title, Svg, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
