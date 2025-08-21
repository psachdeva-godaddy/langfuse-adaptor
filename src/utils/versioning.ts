import * as semver from 'semver';

export type VersionBump = 'major' | 'minor' | 'patch';

export interface VersionInfo {
  version: string;
  major: number;
  minor: number;
  patch: number;
}

export class VersionManager {
  static parseVersion(version: string): VersionInfo {
    const parsed = semver.parse(version);
    if (!parsed) {
      throw new Error(`Invalid version format: ${version}`);
    }
    
    return {
      version: parsed.version,
      major: parsed.major,
      minor: parsed.minor,
      patch: parsed.patch,
    };
  }

  static incrementVersion(currentVersion: string, bump: VersionBump): string {
    const incremented = semver.inc(currentVersion, bump);
    if (!incremented) {
      throw new Error(`Failed to increment version: ${currentVersion}`);
    }
    return incremented;
  }

  static compareVersions(version1: string, version2: string): number {
    return semver.compare(version1, version2);
  }

  static isValidVersion(version: string): boolean {
    return semver.valid(version) !== null;
  }

  static getLatestVersion(versions: string[]): string {
    if (versions.length === 0) {
      throw new Error('No versions provided');
    }
    
    const validVersions = versions.filter(v => this.isValidVersion(v));
    if (validVersions.length === 0) {
      throw new Error('No valid versions found');
    }
    
    return validVersions.sort(semver.rcompare)[0];
  }

  static sortVersions(versions: string[], descending: boolean = true): string[] {
    const validVersions = versions.filter(v => this.isValidVersion(v));
    return validVersions.sort(descending ? semver.rcompare : semver.compare);
  }

  static isNewerVersion(version1: string, version2: string): boolean {
    return semver.gt(version1, version2);
  }

  static satisfiesRange(version: string, range: string): boolean {
    return semver.satisfies(version, range);
  }

  static getVersionRange(minVersion: string, maxVersion?: string): string {
    if (!maxVersion) {
      return `>=${minVersion}`;
    }
    return `>=${minVersion} <=${maxVersion}`;
  }

  static generateInitialVersion(): string {
    return '1.0.0';
  }

  static suggestNextVersion(currentVersion: string, changeType: 'breaking' | 'feature' | 'fix'): string {
    switch (changeType) {
      case 'breaking':
        return this.incrementVersion(currentVersion, 'major');
      case 'feature':
        return this.incrementVersion(currentVersion, 'minor');
      case 'fix':
        return this.incrementVersion(currentVersion, 'patch');
      default:
        throw new Error(`Unknown change type: ${changeType}`);
    }
  }

  static getVersionHistory(versions: string[]): Array<{
    version: string;
    type: 'major' | 'minor' | 'patch' | 'initial';
    previousVersion?: string;
  }> {
    const sortedVersions = this.sortVersions(versions, false); // ascending order
    const history: Array<{
      version: string;
      type: 'major' | 'minor' | 'patch' | 'initial';
      previousVersion?: string;
    }> = [];

    for (let i = 0; i < sortedVersions.length; i++) {
      const version = sortedVersions[i];
      
      if (i === 0) {
        history.push({ version, type: 'initial' });
      } else {
        const previousVersion = sortedVersions[i - 1];
        const current = this.parseVersion(version);
        const previous = this.parseVersion(previousVersion);
        
        let type: 'major' | 'minor' | 'patch';
        
        if (current.major > previous.major) {
          type = 'major';
        } else if (current.minor > previous.minor) {
          type = 'minor';
        } else {
          type = 'patch';
        }
        
        history.push({ version, type, previousVersion });
      }
    }

    return history;
  }

  static validateVersionSequence(versions: string[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (versions.length === 0) {
      return { valid: true, errors: [] };
    }
    
    // Check if all versions are valid
    const invalidVersions = versions.filter(v => !this.isValidVersion(v));
    if (invalidVersions.length > 0) {
      errors.push(`Invalid version formats: ${invalidVersions.join(', ')}`);
    }
    
    // Check for duplicates
    const uniqueVersions = new Set(versions);
    if (uniqueVersions.size !== versions.length) {
      errors.push('Duplicate versions found');
    }
    
    // Check version sequence logic
    const sortedVersions = this.sortVersions(versions, false);
    for (let i = 1; i < sortedVersions.length; i++) {
      const current = this.parseVersion(sortedVersions[i]);
      const previous = this.parseVersion(sortedVersions[i - 1]);
      
      // Check if version increment is logical
      const majorDiff = current.major - previous.major;
      const minorDiff = current.minor - previous.minor;
      const patchDiff = current.patch - previous.patch;
      
      if (majorDiff > 1 || (majorDiff === 1 && (minorDiff !== 0 || patchDiff !== 0))) {
        errors.push(`Suspicious major version jump: ${previous.version} -> ${current.version}`);
      } else if (majorDiff === 0 && minorDiff > 1) {
        errors.push(`Suspicious minor version jump: ${previous.version} -> ${current.version}`);
      } else if (majorDiff === 0 && minorDiff === 0 && patchDiff > 1) {
        errors.push(`Suspicious patch version jump: ${previous.version} -> ${current.version}`);
      }
    }
    
    return { valid: errors.length === 0, errors };
  }

  static createVersionTag(version: string, prefix: string = 'v'): string {
    if (!this.isValidVersion(version)) {
      throw new Error(`Invalid version: ${version}`);
    }
    return `${prefix}${version}`;
  }

  static parseVersionTag(tag: string, prefix: string = 'v'): string {
    if (!tag.startsWith(prefix)) {
      throw new Error(`Tag does not start with prefix '${prefix}': ${tag}`);
    }
    
    const version = tag.substring(prefix.length);
    if (!this.isValidVersion(version)) {
      throw new Error(`Invalid version in tag: ${tag}`);
    }
    
    return version;
  }

  static getVersionMetadata(version: string): {
    isPrerelease: boolean;
    prerelease: string[];
    build: string[];
  } {
    const parsed = semver.parse(version);
    if (!parsed) {
      throw new Error(`Invalid version: ${version}`);
    }
    
    return {
      isPrerelease: parsed.prerelease.length > 0,
      prerelease: parsed.prerelease.map(String),
      build: parsed.build.map(String),
    };
  }
}
